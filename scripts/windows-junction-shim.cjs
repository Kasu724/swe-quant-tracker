const fs = require("node:fs");

if (process.platform === "win32") {
  const originalSymlink = fs.symlink;
  const originalPromiseSymlink = fs.promises.symlink.bind(fs.promises);

  fs.symlink = function symlinkWithJunction(target, destination, type, callback) {
    if (typeof type === "function") {
      return originalSymlink.call(fs, target, destination, "junction", type);
    }
    return originalSymlink.call(fs, target, destination, type || "junction", callback);
  };

  fs.promises.symlink = function symlinkWithJunction(target, destination, type) {
    return originalPromiseSymlink(target, destination, type || "junction");
  };
}
