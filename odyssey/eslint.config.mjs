import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const STORAGE_OWNER = "src/lib/utils/logger.ts";
// P0-T6 split android-bridge.ts into android-bridge/{core,schedule,wallpaper,
// notifications,app-update,index}. Only `core` may touch window.*: the alias
// question has one correct answer and it is answered in one place. The others
// go through nativeBridge()/hasNative()/callNative() and are NOT exempt.
const BRIDGE_OWNER = "src/lib/utils/android-bridge/core.ts";

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
          //
          // TWO selectors, because the access comes in two shapes and the rule
          // used to only match one of them:
          //   window.OdysseyAndroid                    (store the bridge)
          //   window.OdysseyAndroid?.syncSchedule(x)   (reach a method)
          // The old selector required `object.object.name='window'`, which only
          // matches the SECOND shape -- so the most common form of the exact
          // access this rule exists to block passed silently. Verified by probe:
          // one-level exited 0, two-level errored. A guard that misses the
          // common case is worse than no guard, because the config reads as
          // enforcement.
          selector: [
            "MemberExpression[object.name='window'][property.name=/^(OdysseyAndroid|Android|AndroidWallpaper)$/]",
            "MemberExpression[object.object.name='window'][object.property.name=/^(OdysseyAndroid|Android|AndroidWallpaper)$/]",
          ].join(","),
          message:
            "Do not touch window.OdysseyAndroid / window.Android directly. Use nativeBridge(), hasNative() or callNative() from @/lib/utils/android-bridge.",
        },
      ],
    },
  },

  {
    // PERF-5 -- the measurement scripts are Node CLIs, not app code: they
    // `require()` their modules and printing to stdout IS the feature. The
    // exemption is scoped to the directory rather than per file, and it retires
    // the `require()` errors that have sat in `measure-bundle.js` since it moved
    // out of a temp directory into the repo.
    name: "odyssey/node-scripts",
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "off",
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
