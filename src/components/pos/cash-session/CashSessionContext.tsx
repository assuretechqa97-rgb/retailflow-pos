import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { CashSession, AuditLogEntry, DenominationCount, UserRole } from "./types";

interface CashSessionContextValue {
  session: CashSession | null;
  isSessionActive: boolean;
  canSell: boolean;
  startSession: (counts: DenominationCount[], total: number, cashierName: string) => void;
  initiateClosing: () => void;
  completeClosing: (counts: DenominationCount[], total: number, reason?: string) => void;
  cancelClosing: () => void;
  getExpectedCash: () => number;
  addSaleToCash: (amount: number, paymentMethod: string) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  auditLog: AuditLogEntry[];
  cashSalesTotal: number;
}

const CashSessionContext = createContext<CashSessionContextValue | null>(null);

export const useCashSession = () => {
  const ctx = useContext(CashSessionContext);
  if (!ctx) throw new Error("useCashSession must be used within CashSessionProvider");
  return ctx;
};

export const CashSessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<CashSession | null>(null);
  const [cashSalesTotal, setCashSalesTotal] = useState(0);
  const [userRole, setUserRole] = useState<UserRole>("cashier");

  const isSessionActive = session?.status === "active";
  const canSell = isSessionActive;

  const addAuditEntry = (action: string, details: string, amount?: number): AuditLogEntry => ({
    id: crypto.randomUUID(),
    action,
    performedBy: session?.cashierName || "System",
    performedAt: new Date(),
    details,
    amount,
  });

  const startSession = useCallback((counts: DenominationCount[], total: number, cashierName: string) => {
    const entry = addAuditEntry("SESSION_OPENED", `Opening cash: Rs. ${total.toLocaleString()}`, total);
    const newSession: CashSession = {
      id: crypto.randomUUID(),
      cashierName,
      openedAt: new Date(),
      opening: {
        counts,
        total,
        submittedBy: cashierName,
        submittedAt: new Date(),
      },
      status: "active",
      auditLog: [{ ...entry, performedBy: cashierName }],
    };
    setSession(newSession);
    setCashSalesTotal(0);
  }, []);

  const initiateClosing = useCallback(() => {
    setSession(prev => prev ? { ...prev, status: "closing" } : null);
  }, []);

  const cancelClosing = useCallback(() => {
    setSession(prev => prev ? { ...prev, status: "active" } : null);
  }, []);

  const getExpectedCash = useCallback(() => {
    if (!session) return 0;
    return session.opening.total + cashSalesTotal;
  }, [session, cashSalesTotal]);

  const completeClosing = useCallback((counts: DenominationCount[], total: number, reason?: string) => {
    setSession(prev => {
      if (!prev) return null;
      const expected = prev.opening.total + cashSalesTotal;
      const difference = total - expected;
      const entry = addAuditEntry(
        "SESSION_CLOSED",
        `Closing cash: Rs. ${total.toLocaleString()}. Expected: Rs. ${expected.toLocaleString()}. Difference: Rs. ${difference.toLocaleString()}${reason ? `. Reason: ${reason}` : ""}`,
        total
      );
      return {
        ...prev,
        closedAt: new Date(),
        closing: {
          counts,
          total,
          submittedBy: prev.cashierName,
          submittedAt: new Date(),
        },
        expectedCash: expected,
        difference,
        differenceReason: reason,
        status: "closed" as const,
        auditLog: [...prev.auditLog, { ...entry, performedBy: prev.cashierName }],
      };
    });
  }, [cashSalesTotal]);

  const addSaleToCash = useCallback((amount: number, paymentMethod: string) => {
    if (paymentMethod === "cash") {
      setCashSalesTotal(prev => prev + amount);
    }
    setSession(prev => {
      if (!prev) return null;
      const entry: AuditLogEntry = {
        id: crypto.randomUUID(),
        action: "SALE_COMPLETED",
        performedBy: prev.cashierName,
        performedAt: new Date(),
        details: `Sale Rs. ${amount.toLocaleString()} via ${paymentMethod}`,
        amount,
      };
      return { ...prev, auditLog: [...prev.auditLog, entry] };
    });
  }, []);

  return (
    <CashSessionContext.Provider value={{
      session,
      isSessionActive,
      canSell,
      startSession,
      initiateClosing,
      completeClosing,
      cancelClosing,
      getExpectedCash,
      addSaleToCash,
      userRole,
      setUserRole,
      auditLog: session?.auditLog || [],
      cashSalesTotal,
    }}>
      {children}
    </CashSessionContext.Provider>
  );
};
