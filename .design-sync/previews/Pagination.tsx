import { Pagination } from "kub-stake-info";

const noop = () => {};

// page 1 / pageCount 1 returns null, so every cell has at least two pages.
export const Middle = () => <Pagination page={4} pageCount={9} onChange={noop} />;

export const FirstPage = () => <Pagination page={1} pageCount={5} onChange={noop} />;

export const ManyPages = () => <Pagination page={12} pageCount={28} onChange={noop} />;
