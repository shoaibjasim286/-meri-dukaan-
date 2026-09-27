import {
  Archive,
  BarChart3,
  Bot,
  Boxes,
  CalendarCheck,
  ClipboardList,
  Home,
  Layers,
  Receipt,
  RotateCcw,
  Settings as SettingsIcon,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  Banknote,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  hint?: string;
}

export const mainNav: NavItem[] = [
  { label: "Ghar", to: "/", icon: Home, hint: "Dashboard" },
  { label: "Samaan", to: "/samaan", icon: Boxes, hint: "Stock" },
  { label: "Bikri", to: "/bikri", icon: ShoppingCart, hint: "POS" },
  { label: "Kharid", to: "/kharid", icon: Truck, hint: "Purchase" },
  { label: "Udhaar", to: "/udhaar", icon: Wallet, hint: "Credit" },
  { label: "Customers", to: "/customers", icon: Users },
  { label: "Suppliers", to: "/suppliers", icon: Archive },
  { label: "Kharcha", to: "/kharcha", icon: Banknote, hint: "Expense" },
  { label: "Hisaab", to: "/hisaab", icon: BarChart3, hint: "Profit" },
  { label: "Reports", to: "/reports", icon: ClipboardList },
  { label: "AI Sawaal", to: "/ai-sawaal", icon: Bot },
  { label: "Staff", to: "/staff", icon: Users },
  { label: "Settings", to: "/settings", icon: SettingsIcon },
];

export const moreNav: NavItem[] = [
  { label: "Wapsi", to: "/wapsi", icon: RotateCcw, hint: "Returns" },
  { label: "Held Carts", to: "/held-carts", icon: Layers },
  { label: "Receipts", to: "/receipts", icon: Receipt },
  { label: "Daily Closing", to: "/daily-closing", icon: CalendarCheck },
  { label: "Audit Log", to: "/audit-log", icon: ScrollText },
];
