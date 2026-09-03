using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Pipes;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace SWEQuantTracker
{
    internal static class Program
    {
        private const string InstanceName = "Local\\SWEQuantTracker.Tray.Instance";
        private const string PipeName = "SWEQuantTracker.Tray.Control";

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool SetProcessDpiAwarenessContext(IntPtr value);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool SetProcessDPIAware();

        [STAThread]
        private static void Main(string[] args)
        {
            EnableHighDpiRendering();
            bool allowMultiple = Array.Exists(args, argument => string.Equals(argument, "--allow-multiple", StringComparison.OrdinalIgnoreCase));
            bool createdNew = true;
            Mutex mutex = allowMultiple ? null : new Mutex(true, InstanceName, out createdNew);
            if (!createdNew)
            {
                NotifyExistingInstance();
                if (mutex != null) mutex.Dispose();
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            ToolStripManager.RenderMode = ToolStripManagerRenderMode.System;
            try
            {
                Application.Run(new TrayContext(args));
            }
            finally
            {
                if (mutex != null)
                {
                    try { mutex.ReleaseMutex(); } catch { }
                    mutex.Dispose();
                }
            }
        }

        private static void EnableHighDpiRendering()
        {
            try
            {
                // DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2 keeps tray menus crisp when the
                // taskbar is on a scaled display or moves between displays.
                if (SetProcessDpiAwarenessContext(new IntPtr(-4))) return;
            }
            catch (EntryPointNotFoundException) { }
            catch (DllNotFoundException) { }

            try { SetProcessDPIAware(); } catch { }
        }

        private static void NotifyExistingInstance()
        {
            try
            {
                using (NamedPipeClientStream pipe = new NamedPipeClientStream(".", PipeName, PipeDirection.Out))
                {
                    pipe.Connect(1500);
                    using (StreamWriter writer = new StreamWriter(pipe))
                    {
                        writer.WriteLine("open");
                        writer.Flush();
                    }
                }
            }
            catch
            {
                MessageBox.Show("SWE-Quant Tracker is already running in the system tray.", "SWE-Quant Tracker", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }

        internal static string ControlPipeName { get { return PipeName; } }
    }

    internal sealed class TrayContext : ApplicationContext
    {
        private const string ProductName = "SWE-Quant Tracker";
        private readonly ConcurrentQueue<string> events = new ConcurrentQueue<string>();
        private readonly NotifyIcon trayIcon;
        private readonly ToolStripMenuItem openItem;
        private readonly ToolStripMenuItem ingestItem;
        private readonly System.Windows.Forms.Timer eventTimer;
        private readonly string userDataDirectory;
        private readonly bool suppressBrowser;
        private Process service;
        private string origin;
        private bool stopping;

        internal TrayContext(string[] args)
        {
            userDataDirectory = ArgumentValue(args, "user-data-dir") ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), ProductName);
            suppressBrowser = HasArgument(args, "no-open-browser");
            Directory.CreateDirectory(userDataDirectory);

            openItem = new ToolStripMenuItem("Open dashboard", null, delegate { OpenDashboard(); });
            openItem.Enabled = false;
            ingestItem = new ToolStripMenuItem("Run ingestion now", null, delegate { SendCommand("ingest"); });
            ingestItem.Enabled = false;
            ToolStripMenuItem logsItem = new ToolStripMenuItem("Open runtime log", null, delegate { OpenLog(); });
            ToolStripMenuItem exitItem = new ToolStripMenuItem("Exit", null, delegate { ExitThread(); });

            ContextMenuStrip menu = new ContextMenuStrip();
            menu.Items.Add(openItem);
            menu.Items.Add(ingestItem);
            menu.Items.Add(logsItem);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(exitItem);

            Icon icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath) ?? SystemIcons.Application;
            trayIcon = new NotifyIcon();
            trayIcon.Icon = icon;
            trayIcon.Text = ProductName + " is starting";
            trayIcon.ContextMenuStrip = menu;
            trayIcon.Visible = true;
            trayIcon.DoubleClick += delegate { OpenDashboard(); };

            eventTimer = new System.Windows.Forms.Timer();
            eventTimer.Interval = 100;
            eventTimer.Tick += delegate { DrainEvents(); };
            eventTimer.Start();

            StartControlPipe();
            StartService();
        }

        private static string ArgumentValue(string[] args, string name)
        {
            string prefix = "--" + name + "=";
            foreach (string argument in args)
            {
                if (argument.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return argument.Substring(prefix.Length).Trim('"');
            }
            return null;
        }

        private static bool HasArgument(string[] args, string name)
        {
            string expected = "--" + name;
            foreach (string argument in args)
            {
                if (string.Equals(argument, expected, StringComparison.OrdinalIgnoreCase)) return true;
            }
            return false;
        }

        private static string Quote(string value)
        {
            return "\"" + value.Replace("\"", "\\\"") + "\"";
        }

        private void StartService()
        {
            string runtimeDirectory = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "runtime");
            ProcessStartInfo startInfo = new ProcessStartInfo();
            startInfo.FileName = Path.Combine(runtimeDirectory, "node.exe");
            startInfo.Arguments = Quote(Path.Combine(runtimeDirectory, "service.cjs")) + " --user-data-dir=" + Quote(userDataDirectory);
            startInfo.WorkingDirectory = runtimeDirectory;
            startInfo.UseShellExecute = false;
            startInfo.CreateNoWindow = true;
            startInfo.WindowStyle = ProcessWindowStyle.Hidden;
            startInfo.RedirectStandardInput = true;
            startInfo.RedirectStandardOutput = true;
            startInfo.RedirectStandardError = true;

            service = new Process();
            service.StartInfo = startInfo;
            service.EnableRaisingEvents = true;
            service.OutputDataReceived += delegate(object sender, DataReceivedEventArgs eventArgs) { if (eventArgs.Data != null) events.Enqueue(eventArgs.Data); };
            service.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs eventArgs) { if (!string.IsNullOrWhiteSpace(eventArgs.Data)) events.Enqueue("SERVICE_ERROR\t" + eventArgs.Data); };
            service.Exited += delegate { events.Enqueue("SERVICE_EXITED\t" + SafeExitCode()); };

            try
            {
                service.Start();
                service.BeginOutputReadLine();
                service.BeginErrorReadLine();
            }
            catch (Exception error)
            {
                ShowFatal("The local service could not start.\n\n" + error.Message);
            }
        }

        private int SafeExitCode()
        {
            try { return service.ExitCode; } catch { return -1; }
        }

        private void StartControlPipe()
        {
            Thread thread = new Thread(delegate()
            {
                while (!stopping)
                {
                    try
                    {
                        using (NamedPipeServerStream pipe = new NamedPipeServerStream(Program.ControlPipeName, PipeDirection.In, 1))
                        {
                            pipe.WaitForConnection();
                            using (StreamReader reader = new StreamReader(pipe))
                            {
                                string command = reader.ReadLine();
                                if (!string.IsNullOrWhiteSpace(command)) events.Enqueue("PIPE\t" + command);
                            }
                        }
                    }
                    catch
                    {
                        if (!stopping) Thread.Sleep(250);
                    }
                }
            });
            thread.IsBackground = true;
            thread.Name = "SWE-Quant Tracker control pipe";
            thread.Start();
        }

        private void DrainEvents()
        {
            string line;
            while (events.TryDequeue(out line)) HandleEvent(line);
        }

        private void HandleEvent(string line)
        {
            int separator = line.IndexOf('\t');
            string name = separator < 0 ? line : line.Substring(0, separator);
            string value = separator < 0 ? string.Empty : line.Substring(separator + 1);

            if (name == "READY")
            {
                origin = value;
                openItem.Enabled = true;
                ingestItem.Enabled = true;
                trayIcon.Text = ProductName + " is running";
                trayIcon.ShowBalloonTip(2500, ProductName, "The local service is ready and will keep running in the tray.", ToolTipIcon.Info);
                if (!suppressBrowser) OpenDashboard();
            }
            else if (name == "INGESTION_STARTED")
            {
                ingestItem.Enabled = false;
                trayIcon.Text = ProductName + " is ingesting data";
            }
            else if (name == "INGESTION_FINISHED")
            {
                ingestItem.Enabled = true;
                trayIcon.Text = ProductName + " is running";
                if (value != "0") trayIcon.ShowBalloonTip(3500, ProductName, "An ingestion pass failed. Open the runtime log for details.", ToolTipIcon.Warning);
            }
            else if (name == "STATUS")
            {
                trayIcon.ShowBalloonTip(3000, ProductName, Decode(value), ToolTipIcon.Info);
            }
            else if (name == "ERROR")
            {
                ShowFatal(Decode(value));
            }
            else if (name == "SERVICE_ERROR")
            {
                AppendLauncherLog(value);
            }
            else if (name == "SERVICE_EXITED" && !stopping)
            {
                ShowFatal("The local service stopped unexpectedly (exit code " + value + ").\n\nRuntime log: " + LogPath());
            }
            else if (name == "PIPE" && value == "open")
            {
                OpenDashboard();
            }
        }

        private static string Decode(string value)
        {
            try { return Encoding.UTF8.GetString(Convert.FromBase64String(value)); }
            catch { return value; }
        }

        private void SendCommand(string command)
        {
            if (service == null || service.HasExited) return;
            try
            {
                service.StandardInput.WriteLine(command);
                service.StandardInput.Flush();
            }
            catch (Exception error)
            {
                AppendLauncherLog(error.ToString());
            }
        }

        private void OpenDashboard()
        {
            if (string.IsNullOrWhiteSpace(origin)) return;
            try { Process.Start(new ProcessStartInfo(origin) { UseShellExecute = true }); }
            catch (Exception error) { MessageBox.Show(error.Message, ProductName, MessageBoxButtons.OK, MessageBoxIcon.Warning); }
        }

        private string LogPath()
        {
            return Path.Combine(userDataDirectory, "desktop-runtime.log");
        }

        private void OpenLog()
        {
            string logPath = LogPath();
            try
            {
                if (!File.Exists(logPath)) File.WriteAllText(logPath, string.Empty);
                Process.Start(new ProcessStartInfo(logPath) { UseShellExecute = true });
            }
            catch (Exception error) { MessageBox.Show(error.Message, ProductName, MessageBoxButtons.OK, MessageBoxIcon.Warning); }
        }

        private void AppendLauncherLog(string value)
        {
            try { File.AppendAllText(LogPath(), "[" + DateTime.UtcNow.ToString("o") + "] Launcher: " + value + Environment.NewLine); }
            catch { }
        }

        private void ShowFatal(string message)
        {
            if (stopping) return;
            MessageBox.Show(message, ProductName, MessageBoxButtons.OK, MessageBoxIcon.Error);
            ExitThread();
        }

        protected override void ExitThreadCore()
        {
            if (stopping) return;
            stopping = true;
            eventTimer.Stop();
            trayIcon.Visible = false;

            if (service != null && !service.HasExited)
            {
                try
                {
                    service.StandardInput.WriteLine("exit");
                    service.StandardInput.Flush();
                    service.StandardInput.Close();
                    if (!service.WaitForExit(10000)) KillProcessTree(service.Id);
                }
                catch { try { KillProcessTree(service.Id); } catch { } }
            }

            trayIcon.Dispose();
            eventTimer.Dispose();
            if (service != null) service.Dispose();
            base.ExitThreadCore();
        }

        private static void KillProcessTree(int processId)
        {
            ProcessStartInfo info = new ProcessStartInfo("taskkill.exe", "/PID " + processId + " /T /F");
            info.UseShellExecute = false;
            info.CreateNoWindow = true;
            using (Process killer = Process.Start(info)) { if (killer != null) killer.WaitForExit(5000); }
        }
    }
}
