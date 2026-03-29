import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthContext";
import HeaderBar from "@/components/pos/HeaderBar";
import ProductSearchPanel from "@/components/pos/ProductSearchPanel";
import CartPanel from "@/components/pos/CartPanel";
import CheckoutPanel from "@/components/pos/CheckoutPanel";
import HeldBillsDrawer from "@/components/pos/HeldBillsDrawer";
import RecentSalesPanel from "@/components/pos/RecentSalesPanel";
import MobileTabBar from "@/components/pos/MobileTabBar";
import { sampleProducts } from "@/components/pos/sampleData";
import { CashSessionProvider, useCashSession } from "@/components/pos/cash-session/CashSessionContext";
import OpeningCashDialog from "@/components/pos/cash-session/OpeningCashDialog";
import ClosingCashDialog from "@/components/pos/cash-session/ClosingCashDialog";
import CashSessionBanner from "@/components/pos/cash-session/CashSessionBanner";
import SessionClosedSummary from "@/components/pos/cash-session/SessionClosedSummary";
import AuditLogPanel from "@/components/pos/cash-session/AuditLogPanel";
import type {
  CartItem,
  HeldBill,
  RecentSale,
  PaymentMethod,
  Product,
} from "@/components/pos/types";

const IndexInner = () => {
  const { user, logout } = useAuth();
  const cashierName = user?.displayName || "Unknown";
  const isAdmin = user?.role === "admin" || user?.role === "manager";
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [showHeldBills, setShowHeldBills] = useState(false);
  const [showRecentSales, setShowRecentSales] = useState(false);
  const [showClosing, setShowClosing] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [mobileTab, setMobileTab] = useState<"products" | "cart" | "checkout">("products");

  const {
    session,
    canSell,
    startSession,
    initiateClosing,
    completeClosing,
    cancelClosing,
    getExpectedCash,
    addSaleToCash,
    auditLog,
    cashSalesTotal,
  } = useCashSession();

  const cartCount = cartItems.reduce((a, i) => a + i.quantity, 0);
  const needsOpening = !session || session.status === "closed";
  const isClosed = session?.status === "closed";

  const handleAddToCart = useCallback((product: Product, qty: number) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [...prev, { product, quantity: qty }];
    });
    toast.success(`Added ${product.name}`, { duration: 1500 });
  }, []);

  const handleUpdateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setCartItems((prev) => prev.filter((i) => i.product.id !== productId));
    } else {
      setCartItems((prev) =>
        prev.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i))
      );
    }
  }, []);

  const handleRemove = useCallback((productId: string) => {
    setCartItems((prev) => prev.filter((i) => i.product.id !== productId));
    toast.info("Item removed");
  }, []);

  const handleHoldBill = useCallback(() => {
    if (cartItems.length === 0) return;
    const bill: HeldBill = {
      id: crypto.randomUUID(),
      items: [...cartItems],
      heldAt: new Date(),
    };
    setHeldBills((prev) => [...prev, bill]);
    setCartItems([]);
    toast.success("Bill held successfully");
  }, [cartItems]);

  const handleResumeBill = useCallback((billId: string) => {
    setHeldBills((prev) => {
      const bill = prev.find((b) => b.id === billId);
      if (bill) {
        setCartItems(bill.items);
        toast.success("Bill resumed");
      }
      return prev.filter((b) => b.id !== billId);
    });
  }, []);

  const handleDeleteHeldBill = useCallback((billId: string) => {
    setHeldBills((prev) => prev.filter((b) => b.id !== billId));
    toast.info("Held bill deleted");
  }, []);

  const handleCompleteSale = useCallback(
    (paymentMethod: PaymentMethod, cashReceived: number, customerMobile: string) => {
      const total = cartItems.reduce((a, i) => a + i.product.price * i.quantity, 0);
      const sale: RecentSale = {
        id: crypto.randomUUID(),
        items: [...cartItems],
        total,
        paymentMethod,
        cashReceived,
        change: cashReceived - total,
        customerMobile: customerMobile || undefined,
        completedAt: new Date(),
      };
      setRecentSales((prev) => [sale, ...prev]);
      setCartItems([]);
      addSaleToCash(total, paymentMethod);
      toast.success("Sale completed!", { duration: 2000 });
    },
    [cartItems, addSaleToCash]
  );

  const handleCancelSale = useCallback(() => {
    setCartItems([]);
    toast.info("Sale cancelled");
  }, []);

  const handleReprint = useCallback((saleId: string) => {
    toast.success(`Reprinting receipt for #${saleId.slice(0, 8)}`);
  }, []);

  const handleWhatsApp = useCallback((saleId: string) => {
    toast.success(`Sending WhatsApp receipt for #${saleId.slice(0, 8)}`);
  }, []);

  const handleEndShift = () => {
    initiateClosing();
    setShowClosing(true);
  };

  const handleCloseSession = (counts: any, total: number, reason?: string) => {
    completeClosing(counts, total, reason);
    setShowClosing(false);
  };

  const handleNewSession = () => {
    // Reset to trigger opening dialog
    // Session is already closed, so needsOpening will be true after context reset
    window.location.reload();
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <HeaderBar
        cashierName={cashierName}
        heldBillsCount={heldBills.length}
        onHeldBills={() => setShowHeldBills(true)}
        onRecentSales={() => setShowRecentSales(true)}
        onAdminTools={() => toast.info("Admin Tools")}
        onSignOut={() => toast.info("Signed out")}
        onAuditLog={() => setShowAuditLog(true)}
        onEndShift={handleEndShift}
        isAdmin={true}
        hasActiveSession={canSell}
      />

      {/* Cash Session Banner */}
      {canSell && <CashSessionBanner onEndShift={handleEndShift} />}

      {/* Opening Cash Dialog - blocks POS */}
      {needsOpening && !isClosed && (
        <OpeningCashDialog
          open={true}
          cashierName={cashierName}
          onConfirm={(counts, total) => startSession(counts, total, cashierName)}
        />
      )}

      {/* Closed session summary */}
      {isClosed && session ? (
        <SessionClosedSummary
          session={session}
          onNewSession={handleNewSession}
          onViewAuditLog={() => setShowAuditLog(true)}
        />
      ) : (
        <>
          {/* Desktop / Tablet Layout */}
          <div className="flex-1 hidden md:flex overflow-hidden">
            <div className="flex-1 min-w-0 border-r border-border">
              <ProductSearchPanel products={sampleProducts} onAddToCart={handleAddToCart} />
            </div>
            <div className="w-[380px] lg:w-[420px] flex flex-col shrink-0 bg-card">
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto min-h-0">
                  <CartPanel items={cartItems} onUpdateQty={handleUpdateQty} onRemove={handleRemove} />
                </div>
                <div className="border-t border-border shrink-0 overflow-y-auto max-h-[55vh]">
                  <CheckoutPanel
                    items={cartItems}
                    onCompleteSale={handleCompleteSale}
                    onHoldBill={handleHoldBill}
                    onCancelSale={handleCancelSale}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="flex-1 md:hidden overflow-hidden pb-14">
            {mobileTab === "products" && (
              <ProductSearchPanel products={sampleProducts} onAddToCart={handleAddToCart} />
            )}
            {mobileTab === "cart" && (
              <div className="h-full overflow-y-auto">
                <CartPanel items={cartItems} onUpdateQty={handleUpdateQty} onRemove={handleRemove} />
              </div>
            )}
            {mobileTab === "checkout" && (
              <div className="h-full overflow-y-auto">
                <CheckoutPanel
                  items={cartItems}
                  onCompleteSale={handleCompleteSale}
                  onHoldBill={handleHoldBill}
                  onCancelSale={handleCancelSale}
                />
              </div>
            )}
          </div>

          <MobileTabBar activeTab={mobileTab} onTabChange={setMobileTab} cartCount={cartCount} />
        </>
      )}

      {/* Closing Cash Dialog */}
      <ClosingCashDialog
        open={showClosing}
        onClose={() => {
          setShowClosing(false);
          cancelClosing();
        }}
        cashierName={cashierName}
        expectedCash={getExpectedCash()}
        openingCash={session?.opening.total || 0}
        cashSalesTotal={cashSalesTotal}
        onConfirm={handleCloseSession}
      />

      {/* Audit Log */}
      <AuditLogPanel
        open={showAuditLog}
        onClose={() => setShowAuditLog(false)}
        entries={auditLog}
      />

      <HeldBillsDrawer
        open={showHeldBills}
        onClose={() => setShowHeldBills(false)}
        heldBills={heldBills}
        onResume={handleResumeBill}
        onDelete={handleDeleteHeldBill}
      />

      <RecentSalesPanel
        open={showRecentSales}
        onClose={() => setShowRecentSales(false)}
        sales={recentSales}
        onReprint={handleReprint}
        onWhatsApp={handleWhatsApp}
      />
    </div>
  );
};

const Index = () => (
  <CashSessionProvider>
    <IndexInner />
  </CashSessionProvider>
);

export default Index;
