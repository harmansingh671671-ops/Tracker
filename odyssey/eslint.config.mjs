import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const STORAGE_OWNER = "src/lib/utils/logger.ts";
const BRIDGE_OWNER = "src/lib/utils/android-bridge.ts";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // ---------------------------------------------------------------------
  // P8 PASS 5 -- guard rails.
  //
  // Everything above is Next's defaults, which is why the classes of defect
  // recorded in inefficiencies.md section 10 could accumulate unnoticed:
  // nothing failed the build. These rules make new code fail loudly instead.
  //
  // Deliberately scoped: each has an exemption only where the pattern is the
  // legitimate implementation, never to silence a whole file.
  // ---------------------------------------------------------------------
  {
    name: "odyssey/guard-rails",
    rules: {
      // C1 -- an empty catch is how 77 failures were invisible. `allowEmptyCatch`
      // stays FALSE so `catch {}` is an error; the logger's own two guards are
      // documented exceptions, not a licence.
      "no-empty": ["error", { allowEmptyCatch: false }],
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // C4 -- `any` defeated checking exactly where it mattered most (the native
      // bridge). Zero remain, so this can simply be an error.
      "@typescript-eslint/no-explicit-any": "error",

      // Background features must be able to stand down, and every write needs a
      // decision attached -- that is the P8 rule 6.6 step 2 test.
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
    },
  },
  {
    // C2 -- one home per concern.
    name: "odyssey/storage-boundary",
    files: ["src/**/*.{ts,tsx}"],
    ignores: [STORAGE_OWNER],
    rules: {
      // 85 direct call sites each re-implemented the same try/catch. One module
      // owns it now; reaching past it reintroduces the duplication.
      "no-restricted-properties": [
        "error",
        {
          object: "localStorage",
          property: "getItem",
          message: "Use readString/readJson/readBool from @/lib/utils/logger instead of localStorage.getItem.",
        },
        {
          object: "localStorage",
          property: "setItem",
          message: "Use writeString/writeJson from @/lib/utils/logger instead of localStorage.setItem.",
        },
        {
          object: "localStorage",
          property: "removeItem",
          message: "Use remove from @/lib/utils/logger instead of localStorage.removeItem.",
        },
      ],
    },
  },
  {
    // C2 -- the bridge alias question must be answered in exactly one place.
    name: "odyssey/bridge-boundary",
    files: ["src/**/*.{ts,tsx}"],
    ignores: [BRIDGE_OWNER],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          // Referencing the namespaces directly is what let 59 duplicated
          // detect/call/fallback blocks drift apart. Use nativeBridge()/
          // hasNative()/callNative() instead.
          selector:
            "MemberExpression[object.object.name='window'][object.property.name=/^(OdysseyAndroid|Android|AndroidWallpaper)$/]",
          message:
            "Do not touch window.OdysseyAndroid / window.Android directly. Use nativeBridge(), hasNative() or callNative() from @/lib/utils/android-bridge.",
        },
      ],
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
