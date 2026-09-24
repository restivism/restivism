import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import Index from "./pages/Index";
import RestSession from "./pages/RestSession";
import { NIP19Page } from "./pages/NIP19Page";
import NotFound from "./pages/NotFound";
import NostrProvider from '@/components/NostrProvider';
import { NostrSync } from '@/components/NostrSync';
import { NostrLoginProvider } from '@nostrify/react/login';

// The existing Nostr route keeps its providers. The private team workspace
// never mounts them, connects to relays, or publishes team records.
function NetworkIdentity() {
  return <NostrLoginProvider storageKey="nostr:login"><NostrProvider><NostrSync /><NIP19Page /></NostrProvider></NostrLoginProvider>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/rest/:practiceId" element={<RestSession />} />
        {/* NIP-19 route for npub1, note1, naddr1, nevent1, nprofile1 */}
        <Route path="/:nip19" element={<NetworkIdentity />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;
