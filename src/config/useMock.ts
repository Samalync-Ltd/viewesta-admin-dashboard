/**
 * Use mock data when true. Set VITE_USE_MOCK=false in .env when API is ready.
 */
export const useMock = import.meta.env.VITE_USE_MOCK !== "false";
