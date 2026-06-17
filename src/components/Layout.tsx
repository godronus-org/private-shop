import * as React from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function Layout({ children, fullBleed = false, user }: { children: React.ReactNode; fullBleed?: boolean; user?: string }) {
  return (
    <>
      <Header user={user} />
      {fullBleed ? children : <div className="page">{children}</div>}
      <Footer />
    </>
  );
}
