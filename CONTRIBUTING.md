# Contributing

Thanks for helping improve SWE-Quant Tracker. Contributions of code,
documentation, source coverage, test fixtures, and bug reports are welcome.

## Project scope

The tracker focuses on internships in:

- software engineering and closely related technical roles
- quantitative development, research, and trading

Prefer an employer's official careers page, public ATS feed, or documented public endpoint. Every
listing should preserve a link to an official source or application page. Do not add sources that
require bypassing authentication, access controls, CAPTCHAs, or anti-bot protections.

## Development workflow

1. Fork the repository and create a focused branch.
2. Copy `.env.example` to `.env` and follow the local setup in [`README.md`](README.md#local-setup).
3. Make the smallest coherent change and add or update tests when behavior changes.
4. Run the relevant checks:

   ```bash
   pnpm test
   pnpm typecheck
   pnpm build
   ```

5. Open a pull request that explains the problem, the approach, and how you verified it.

Database changes should include a Prisma migration. Adapter changes should include representative,
sanitized fixtures or mocked payloads and tests for normalization behavior.

## Adding an employer or source

- Confirm that the employer offers an in-scope SWE or quant internship.
- Use the employer's canonical name and official careers URL.
- Reuse an existing adapter when possible.
- Add or update seed data in `packages/db/src/seed-data.ts`.
- Never commit API keys, session cookies, webhook URLs, personal data, or other secrets.
- Verify that generated application links resolve to the employer or its authorized ATS provider.

If a site blocks automated access, document it as not yet tracked instead of attempting to evade the
restriction.

## Pull request guidelines

Keep pull requests focused and avoid unrelated formatting changes. Update documentation when setup,
configuration, commands, or user-facing behavior changes. By contributing, you agree that your
contributions are licensed under the repository's [MIT License](LICENSE).

## Reporting security issues

Please do not open a public GitHub issue for a suspected vulnerability or exposed secret. Follow the
instructions in [SECURITY.md](SECURITY.md) and use GitHub's private vulnerability reporting feature
from this repository's **Security** tab by selecting **Report a vulnerability**. Do not include
passwords, tokens, API keys, personal data, or other secrets in the report. Include the affected
component or version, reproduction steps or a minimal proof of concept, relevant sanitized logs or
links, and the potential impact.

If the private-reporting button is unavailable, do not disclose vulnerability details publicly. Open a
minimal public issue asking the maintainers for a secure reporting channel instead.
