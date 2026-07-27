# Third-Party Notices

Thind Transport's website and the LoadOff platform are proprietary. The
software incorporates the third-party open-source packages listed below,
each under its own license. Nothing here grants any right to the
proprietary portions of this repository.

This file is generated. To refresh it after a dependency change:

```
node scripts/license-audit.mjs --notices
```

Generated from 219 production packages (direct and transitive).

## Standing obligations

Things that constrain what we may do, as opposed to notices we merely owe.

- **`web-push` (MPL-2.0)** — file-level copyleft. Combining it with
  proprietary code is explicitly permitted, so using it as a dependency is fine.
  Forking it and editing its files is not: those files would have to be published
  under the same license. Upgrade it, never vendor-and-modify it.

- **`geist` (SIL Open Font License)** — the font may be bundled and served;
  it may not be sold on its own, and the reserved font name must not be used
  for a modified version.

## Packages requiring attribution

Apache-2.0, BSD, MPL-2.0, OFL, and CC-BY all require that their copyright
notice and license text accompany redistribution. The full text of each ships
inside the package's own directory under `node_modules/<name>/`.

| Package | Version | License |
| --- | --- | --- |
| `@aws-sdk/client-sesv2` | 3.1079.0 | Apache-2.0 |
| `@aws-sdk/core` | 3.974.27 | Apache-2.0 |
| `@aws-sdk/credential-provider-env` | 3.972.53 | Apache-2.0 |
| `@aws-sdk/credential-provider-http` | 3.972.55 | Apache-2.0 |
| `@aws-sdk/credential-provider-ini` | 3.972.60 | Apache-2.0 |
| `@aws-sdk/credential-provider-login` | 3.972.59 | Apache-2.0 |
| `@aws-sdk/credential-provider-node` | 3.972.62 | Apache-2.0 |
| `@aws-sdk/credential-provider-process` | 3.972.53 | Apache-2.0 |
| `@aws-sdk/credential-provider-sso` | 3.972.59 | Apache-2.0 |
| `@aws-sdk/credential-provider-web-identity` | 3.972.59 | Apache-2.0 |
| `@aws-sdk/nested-clients` | 3.997.27 | Apache-2.0 |
| `@aws-sdk/signature-v4-multi-region` | 3.996.38 | Apache-2.0 |
| `@aws-sdk/token-providers` | 3.1079.0 | Apache-2.0 |
| `@aws-sdk/types` | 3.973.15 | Apache-2.0 |
| `@aws-sdk/xml-builder` | 3.972.33 | Apache-2.0 |
| `@aws/lambda-invoke-store` | 0.3.0 | Apache-2.0 |
| `@smithy/core` | 3.29.1 | Apache-2.0 |
| `@smithy/credential-provider-imds` | 4.4.6 | Apache-2.0 |
| `@smithy/fetch-http-handler` | 5.6.3 | Apache-2.0 |
| `@smithy/node-http-handler` | 4.9.3 | Apache-2.0 |
| `@smithy/signature-v4` | 5.6.2 | Apache-2.0 |
| `@smithy/types` | 4.15.1 | Apache-2.0 |
| `@swc/helpers` | 0.5.15 | Apache-2.0 |
| `@vercel/blob` | 2.4.0 | Apache-2.0 |
| `@vercel/speed-insights` | 2.0.0 | Apache-2.0 |
| `baseline-browser-mapping` | 2.10.41 | Apache-2.0 |
| `buffer-equal-constant-time` | 1.0.1 | BSD-3-Clause |
| `caniuse-lite` | 1.0.30001800 | CC-BY-4.0 |
| `class-variance-authority` | 0.7.1 | Apache-2.0 |
| `deepmerge-ts` | 7.1.5 | BSD-3-Clause |
| `domelementtype` | 2.3.0 | BSD-2-Clause |
| `domhandler` | 5.0.3 | BSD-2-Clause |
| `domutils` | 3.2.2 | BSD-2-Clause |
| `ecdsa-sig-formatter` | 1.0.11 | Apache-2.0 |
| `entities` | 4.5.0 | BSD-2-Clause |
| `geist` | 1.7.2 | SIL OPEN FONT LICENSE |
| `leaflet` | 1.9.4 | BSD-2-Clause |
| `pdfjs-dist` | 5.4.530 | Apache-2.0 |
| `source-map-js` | 1.2.1 | BSD-3-Clause |
| `typescript` | 5.9.3 | Apache-2.0 |
| `web-push` | 3.6.7 | MPL-2.0 |

## All production dependencies by license

### MIT — 166 packages

`@floating-ui/core`, `@floating-ui/dom`, `@floating-ui/react-dom`, `@floating-ui/utils`, `@hookform/resolvers`, `@next/env`, `@panva/hkdf`, `@pdf-lib/standard-fonts`, `@pdf-lib/upng`, `@pinojs/redact`, `@radix-ui/number`, `@radix-ui/primitive`, `@radix-ui/react-accordion`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-arrow`, `@radix-ui/react-avatar`, `@radix-ui/react-checkbox`, `@radix-ui/react-collapsible`, `@radix-ui/react-collection`, `@radix-ui/react-compose-refs`, `@radix-ui/react-context`, `@radix-ui/react-dialog`, `@radix-ui/react-direction`, `@radix-ui/react-dismissable-layer`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-focus-guards`, `@radix-ui/react-focus-scope`, `@radix-ui/react-hover-card`, `@radix-ui/react-id`, `@radix-ui/react-label`, `@radix-ui/react-menu`, `@radix-ui/react-popover`, `@radix-ui/react-popper`, `@radix-ui/react-portal`, `@radix-ui/react-presence`, `@radix-ui/react-primitive`, `@radix-ui/react-radio-group`, `@radix-ui/react-roving-focus`, `@radix-ui/react-scroll-area`, `@radix-ui/react-select`, `@radix-ui/react-separator`, `@radix-ui/react-slider`, `@radix-ui/react-slot`, `@radix-ui/react-switch`, `@radix-ui/react-toast`, `@radix-ui/react-tooltip`, `@radix-ui/react-use-callback-ref`, `@radix-ui/react-use-controllable-state`, `@radix-ui/react-use-effect-event`, `@radix-ui/react-use-escape-keydown`, `@radix-ui/react-use-is-hydrated`, `@radix-ui/react-use-layout-effect`, `@radix-ui/react-use-previous`, `@radix-ui/react-use-rect`, `@radix-ui/react-use-size`, `@radix-ui/react-visually-hidden`, `@radix-ui/rect`, `@selderee/plugin-htmlparser2`, `@types/bcrypt`, `@types/node`, `@types/nodemailer`, `@types/react`, `@types/react-dom`, `@vercel/analytics`, `agent-base`, `aria-hidden`, `asn1.js`, `async-retry`, `atomic-sleep`, `bcrypt`, `bn.js`, `bowser`, `client-only`, `clsx`, `csstype`, `debug`, `detect-node-es`, `dom-serializer`, `embla-carousel`, `embla-carousel-react`, `embla-carousel-reactive-utils`, `encoding-japanese`, `framer-motion`, `get-nonce`, `he`, `html-to-text`, `htmlparser2`, `http_ece`, `https-proxy-agent`, `iconv-lite`, `imapflow`, `ip-address`, `is-buffer`, `is-node-process`, `jose`, `jwa`, `jws`, `leac`, `libbase64`, `libmime`, `libqp`, `linkify-it`, `mailparser`, `minimist`, `motion-dom`, `motion-utils`, `ms`, `nanoid`, `next`, `node-addon-api`, `node-gyp-build`, `oauth4webapi`, `on-exit-leak-free`, `parseley`, `pdf-lib`, `peberminta`, `pg`, `pg-connection-string`, `pg-pool`, `pg-protocol`, `pg-types`, `pgpass`, `pino`, `pino-abstract-transport`, `pino-std-serializers`, `postcss`, `postgres-array`, `postgres-bytea`, `postgres-date`, `postgres-interval`, `preact`, `preact-render-to-string`, `process-warning`, `punycode.js`, `quick-format-unescaped`, `react`, `react-dom`, `react-hook-form`, `react-remove-scroll`, `react-remove-scroll-bar`, `react-style-singleton`, `real-require`, `retry`, `safe-buffer`, `safe-stable-stringify`, `safer-buffer`, `scheduler`, `selderee`, `smart-buffer`, `socks`, `sonic-boom`, `sonner`, `styled-jsx`, `tailwind-merge`, `tailwindcss-animate`, `thread-stream`, `throttleit`, `tlds`, `uc.micro`, `undici`, `undici-types`, `use-callback-ref`, `use-sidecar`, `use-sync-external-store`, `xtend`, `zod`

### Apache-2.0 — 30 packages

`@aws-sdk/client-sesv2`, `@aws-sdk/core`, `@aws-sdk/credential-provider-env`, `@aws-sdk/credential-provider-http`, `@aws-sdk/credential-provider-ini`, `@aws-sdk/credential-provider-login`, `@aws-sdk/credential-provider-node`, `@aws-sdk/credential-provider-process`, `@aws-sdk/credential-provider-sso`, `@aws-sdk/credential-provider-web-identity`, `@aws-sdk/nested-clients`, `@aws-sdk/signature-v4-multi-region`, `@aws-sdk/token-providers`, `@aws-sdk/types`, `@aws-sdk/xml-builder`, `@aws/lambda-invoke-store`, `@smithy/core`, `@smithy/credential-provider-imds`, `@smithy/fetch-http-handler`, `@smithy/node-http-handler`, `@smithy/signature-v4`, `@smithy/types`, `@swc/helpers`, `@vercel/blob`, `@vercel/speed-insights`, `baseline-browser-mapping`, `class-variance-authority`, `ecdsa-sig-formatter`, `pdfjs-dist`, `typescript`

### ISC — 8 packages

`@auth/core`, `inherits`, `lucide-react`, `minimalistic-assert`, `next-auth`, `pg-int8`, `picocolors`, `split2`

### BSD-2-Clause — 5 packages

`domelementtype`, `domhandler`, `domutils`, `entities`, `leaflet`

### BSD-3-Clause — 3 packages

`buffer-equal-constant-time`, `deepmerge-ts`, `source-map-js`

### (MIT OR EUPL-1.1+) — 1 package

`@zone-eu/mailsplit`

### CC-BY-4.0 — 1 package

`caniuse-lite`

### SIL OPEN FONT LICENSE — 1 package

`geist`

### MIT-0 — 1 package

`nodemailer`

### (MIT AND Zlib) — 1 package

`pako`

### 0BSD — 1 package

`tslib`

### MPL-2.0 — 1 package

`web-push`
