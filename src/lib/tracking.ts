// Pixel & Conversion Tracking Utility
// Events are dispatched to Meta Pixel + Google Ads when configured

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    gtag?: (...args: any[]) => void;
  }
}

type TrackingEvent =
  | "page_view"
  | "view_content"
  | "search"
  | "add_to_cart"
  | "begin_checkout"
  | "add_payment_info"
  | "purchase"
  | "generate_lead"
  | "request_quote"
  | "whatsapp_click";

export const trackEvent = (event: TrackingEvent, data?: Record<string, any>) => {
  // Meta Pixel
  if (window.fbq) {
    const fbEvents: Record<string, string> = {
      page_view: "PageView",
      view_content: "ViewContent",
      search: "Search",
      add_to_cart: "AddToCart",
      begin_checkout: "InitiateCheckout",
      add_payment_info: "AddPaymentInfo",
      purchase: "Purchase",
      generate_lead: "Lead",
      request_quote: "Lead",
      whatsapp_click: "Contact",
    };
    window.fbq("track", fbEvents[event] || event, data);
  }

  // Google Ads / GA4
  if (window.gtag) {
    window.gtag("event", event, data);
  }
};

export const formatCurrency = (value: number) =>
  `R$ ${value.toFixed(2).replace(".", ",")}`;

export const formatCurrencyShort = (value: number) => {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1).replace(".", ",")}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1).replace(".", ",")}K`;
  return formatCurrency(value);
};
