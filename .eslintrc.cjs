/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["react", "react-hooks", "import"],
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier",
  ],
  settings: {
    react: { version: "detect" },
  },
  rules: {
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off",
    "import/no-unresolved": "off",
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  },
  overrides: [
    {
      // Module boundary: only SnapshotService may import internal engine modules.
      // Everything else must treat src/services/_internal as private.
      files: ["src/**/*.{ts,tsx,js,jsx}"],
      excludedFiles: ["src/services/SnapshotService.ts"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              "src/services/_internal/*",
              "src/services/_internal/**",
              "../services/_internal/*",
              "../services/_internal/**",
              "./_internal/*",
              "./_internal/**",
            ],
          },
        ],
      },
    },
    {
      // SnapshotService is allowed to import internal engines.
      files: ["src/services/SnapshotService.ts"],
      rules: {
        "no-restricted-imports": "off",
      },
    },
    {
      files: ["src/screens/**/*.{ts,tsx,js,jsx}"],
      rules: {
        // SnapshotService is the ONLY allowed entrypoint for relationship intelligence.
        // Prevent screens from importing internal engines directly.
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              "../services/*Engine*",
              "../services/*Engine*Service",
              "../services/*Predictor*",
              "../services/HealthScoreService",
              "../services/ConflictPredictorService",
              "../services/_internal/*",
              "../services/_internal/**",
              "../services/RelationshipEngineService",
            ],
            paths: [
              {
                name: "../services/RelationshipEngineService",
                message: "Screens must consume SnapshotService.getSnapshot(); engines are private.",
              },
            ],
          },
        ],
      },
    },
    // Navigation must not import screens directly (keeps navigation strict without pulling in screens)
    {
      files: ["src/navigation/**/*.{ts,tsx,js,jsx}"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            "patterns": ["../screens/*", "../screens/**"]
          }
        ]
      }
    },

  ],
  ignorePatterns: ["node_modules/", "dist/", "build/", "android/", "ios/"],
};
