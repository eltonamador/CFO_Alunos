import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MobileSession } from "./MobileSession";
import {
  clearNavigationState,
  initializeNavigationOwner,
  NAVIGATION_KEY,
  readNavigationState,
  saveNavigationState,
} from "@/modules/mobile-session/infrastructure/navigationStorage";

const navigation = vi.hoisted(() => ({
  pathname: "/aluno/ficha",
  search: "tab=contato",
  router: { replace: vi.fn(), refresh: vi.fn() },
}));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
  useRouter: () => navigation.router,
}));
const identity = { userId: "a", role: "aluno" as const };

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
  navigation.pathname = "/aluno/ficha";
  navigation.search = "tab=contato";
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  Object.defineProperty(window, "scrollY", { configurable: true, value: 480 });
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ciclo de vida mobile", () => {
  it("salva ao ocultar, preserva contexto ao voltar e não atualiza ao reconectar", () => {
    render(<MobileSession identity={identity} />);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    fireEvent(document, new Event("visibilitychange"));
    expect(readNavigationState(identity)).toMatchObject({
      href: "/aluno/ficha?tab=contato",
      scrollY: 480,
    });
    fireEvent(window, new Event("offline"));
    fireEvent(window, new Event("online"));
    expect(screen.getByRole("status")).toHaveTextContent("Conexão restabelecida");
    expect(navigation.router.refresh).not.toHaveBeenCalled();
    expect(navigation.router.replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Atualizar consulta" }));
    expect(navigation.router.refresh).toHaveBeenCalledOnce();
  });
  it("restaura rolagem após remontagem sem perder a aba", () => {
    initializeNavigationOwner(identity);
    saveNavigationState(identity, "/aluno/ficha?tab=contato", 920);
    render(<MobileSession identity={identity} />);
    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 920, behavior: "instant" });
  });
  it("retoma o último destino somente no lançamento explícito, inclusive em StrictMode", () => {
    initializeNavigationOwner(identity);
    saveNavigationState(identity, "/aluno/ficha?tab=contato", 920);
    sessionStorage.clear();
    navigation.pathname = "/aluno";
    navigation.search = "resume=1";
    render(
      <StrictMode>
        <MobileSession identity={identity} />
      </StrictMode>,
    );
    expect(navigation.router.replace).toHaveBeenCalledWith("/aluno/ficha?tab=contato", {
      scroll: false,
    });
    expect(readNavigationState(identity, true)?.href).toBe("/aluno/ficha?tab=contato");
    expect(readNavigationState(identity)?.scrollY).toBe(920);
  });
  it("respeita links diretos e descarta o contexto de outra conta", () => {
    initializeNavigationOwner(identity);
    saveNavigationState(identity, "/aluno/estagio", 920);
    render(<MobileSession identity={{ ...identity, userId: "b" }} />);
    expect(navigation.router.replace).not.toHaveBeenCalled();
    expect(readNavigationState(identity)).toBeNull();
    expect(readNavigationState({ ...identity, userId: "b" })?.href).toBe(
      "/aluno/ficha?tab=contato",
    );
  });
  it("não recria contexto depois do logout ou dos eventos tardios", () => {
    render(<MobileSession identity={identity} />);
    clearNavigationState();
    fireEvent(window, new Event("scroll"));
    fireEvent(window, new Event("pagehide"));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(localStorage.getItem(NAVIGATION_KEY)).toBeNull();
    expect(sessionStorage.getItem(NAVIGATION_KEY)).toBeNull();
  });
  it("continua utilizável quando o navegador bloqueia armazenamento", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });
    expect(() => render(<MobileSession identity={identity} />)).not.toThrow();
    fireEvent(window, new Event("pagehide"));
  });
});
