/** `VITE_CONCURRO_DATA=mock` runs the app on in-browser fixtures (the original mockup); otherwise it uses the API. */
export const MOCK = import.meta.env.VITE_CONCURRO_DATA === 'mock';
