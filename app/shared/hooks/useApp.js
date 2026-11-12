import { createContext, useContext } from 'react';

const Ctx = createContext(null);
const useApp = () => useContext(Ctx);

export { Ctx, useApp };
