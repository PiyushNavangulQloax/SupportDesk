/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
            tsx: false,
            decorators: false,
            dynamicImport: true,
          },
          target: "es2022",
        },
        module: {
          type: "es6",
        },
      },
    ],
  },
  testMatch: ["**/tests/**/*.spec.ts", "**/tests/**/*.jest.ts"],
  verbose: true,
};
