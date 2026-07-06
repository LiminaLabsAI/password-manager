import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "specs/**",
      ".opencode/**",
      ".agent/**",
      ".momentum/**",
      "scripts/**",
      ".githooks/**",
      "prisma/migrations/**",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
];

export default config;