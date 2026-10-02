import { daysAgoIso } from "./format";
import type {
  AppNotification,
  AuditEntry,
  CreditPayment,
  Customer,
  DayClosing,
  Expense,
  HeldCart,
  Product,
  Purchase,
  ReturnRecord,
  Sale,
  Settings,
  Staff,
  StockAdjustment,
  Supplier,
} from "./types";
import { PERMISSION_KEYS } from "./types";

const perms = (allowed: string[]) =>
  Object.fromEntries(PERMISSION_KEYS.map((k) => [k, allowed.includes(k)]));

export const demoSuppliers: Supplier[] = [
  {
    id: "sup1",
    name: "Haji Traders",
    phone: "0301-2233445",
    company: "Haji Wholesale Market",
    balance: 42500,
    lastPurchase: daysAgoIso(1, 17, 10),
  },
  {
    id: "sup2",
    name: "Shahzad Distributors",
    phone: "0321-7788990",
    company: "Coca Cola / Pepsi Agency",
    balance: 18300,
    lastPurchase: daysAgoIso(3, 12, 40),
  },
  {
    id: "sup3",
    name: "Nadeem Cosmetics",
    phone: "0345-5566778",
    company: "Personal Care Supply",
    balance: 0,
    lastPurchase: daysAgoIso(9, 15, 5),
  },
  {
    id: "sup4",
    name: "Punjab Atta Mills",
    phone: "0300-9988776",
    company: "Flour & Grains",
    balance: 7600,
    lastPurchase: daysAgoIso(5, 10, 0),
  },
];

const p = (
  id: string,
  name: string,
  category: Product["category"],
  unit: string,
  purchasePrice: number,
  salePrice: number,
  stock: number,
  lowStockLimit: number,
  supplierId: string,
  emoji: string,
): Product => ({
  id,
  name,
  category,
  unit,
  purchasePrice,
  salePrice,
  stock,
  lowStockLimit,
  supplierId,
  active: true,
  emoji,
});

export const demoProducts: Product[] = [
  p("pr1", "Sugar 1kg", "Grocery", "Packet", 145, 170, 12, 15, "sup1", "🍬"),
  p("pr2", "Milk 1L", "Grocery", "Packet", 190, 215, 4, 10, "sup1", "🥛"),
  p("pr3", "Atta 10kg", "Grocery", "Bag", 1180, 1320, 18, 6, "sup4", "🌾"),
  p("pr4", "Cooking Oil 5L", "Grocery", "Bottle", 2450, 2750, 9, 5, "sup1", "🛢️"),
  p("pr5", "Basmati Chawal 5kg", "Grocery", "Bag", 1550, 1790, 11, 5, "sup4", "🍚"),
  p("pr6", "Chai Patti 950g", "Grocery", "Packet", 1290, 1450, 7, 6, "sup1", "🍵"),
  p("pr7", "Coca Cola 1.5L", "Drinks", "Bottle", 210, 250, 36, 12, "sup2", "🥤"),
  p("pr8", "Pepsi 1.5L", "Drinks", "Bottle", 205, 245, 28, 12, "sup2", "🧃"),
  p("pr9", "Sting 500ml", "Drinks", "Bottle", 95, 120, 40, 15, "sup2", "⚡"),
  p("pr10", "Mineral Water 1.5L", "Drinks", "Bottle", 55, 80, 3, 12, "sup2", "💧"),
  p("pr11", "Lays Masala", "Snacks", "Packet", 42, 50, 60, 20, "sup1", "🥔"),
  p("pr12", "Slanty Chilli", "Snacks", "Packet", 16, 20, 85, 25, "sup1", "🌶️"),
  p("pr13", "Dairy Milk 38g", "Snacks", "Bar", 130, 150, 24, 10, "sup1", "🍫"),
  p("pr14", "Prince Biscuit", "Snacks", "Roll", 38, 45, 5, 20, "sup1", "🍪"),
  p("pr15", "Lifebuoy Soap", "Personal Care", "Piece", 125, 150, 22, 10, "sup3", "🧼"),
  p("pr16", "Head & Shoulders 185ml", "Personal Care", "Bottle", 610, 690, 8, 5, "sup3", "🧴"),
  p("pr17", "Colgate 140g", "Personal Care", "Tube", 285, 330, 14, 8, "sup3", "🪥"),
  p("pr18", "Surf Excel 1kg", "Personal Care", "Packet", 520, 590, 2, 8, "sup3", "🧺"),
  p("pr19", "Match Box", "Other", "Piece", 8, 12, 120, 30, "sup1", "🔥"),
  p("pr20", "Candle Pack", "Other", "Pack", 90, 120, 16, 8, "sup1", "🕯️"),
  p("pr21", "AA Battery Pair", "Other", "Pair", 110, 150, 19, 10, "sup1", "🔋"),
  p("pr22", "Mobile Load Card 100", "Other", "Card", 96, 100, 45, 20, "sup1", "📱"),
];

export const demoCustomers: Customer[] = [
  {
    id: "cu1",
    name: "Muhammad Bilal",
    phone: "0300-1234567",
    address: "Street 4, Gulberg",
    balance: 8450,
    lastActivity: daysAgoIso(0, 10, 15),
  },
  {
    id: "cu2",
    name: "Ahmed Raza",
    phone: "0333-9876543",
    address: "Model Town Link Road",
    balance: 6200,
    lastActivity: daysAgoIso(1, 18, 5),
  },
  {
    id: "cu3",
    name: "Sana Khan",
    phone: "0345-1122334",
    address: "Shadman Colony",
    balance: 3100,
    lastActivity: daysAgoIso(2, 13, 45),
  },
  {
    id: "cu4",
    name: "Hafiz Usman",
    phone: "0311-4455667",
    address: "Chungi Amar Sidhu",
    balance: 12600,
    lastActivity: daysAgoIso(12, 16, 20),
  },
  {
    id: "cu5",
    name: "Imran Butt",
    phone: "0322-7654321",
    address: "Ichhra Bazaar",
    balance: 4250,
    lastActivity: daysAgoIso(4, 11, 30),
  },
  {
    id: "cu6",
    name: "Zainab Bibi",
    phone: "0302-3344556",
    address: "Township Block B",
    balance: 2200,
    lastActivity: daysAgoIso(6, 9, 50),
  },
  {
    id: "cu7",
    name: "Naveed Anjum",
    phone: "0334-8899001",
    address: "Ferozepur Road",
    balance: 0,
    lastActivity: daysAgoIso(8, 17, 15),
  },
];

const item = (productId: string, qty: number) => {
  const prod = demoProducts.find((x) => x.id === productId)!;
  return {
    productId,
    name: prod.name,
    qty,
    price: prod.salePrice,
    purchasePrice: prod.purchasePrice,
  };
};

const mkSale = (
  number: number,
  date: string,
  itemsRaw: [string, number][],
  mode: Sale["mode"],
  customerId: string | null,
  discount = 0,
  paidOverride?: number,
): Sale => {
  const items = itemsRaw.map(([id, q]) => item(id, q));
  const total =
    items.reduce((s, i) => s + i.price * i.qty, 0) - discount;
  const customer = demoCustomers.find((c) => c.id === customerId);
  return {
    id: `sale${number}`,
    number,
    date,
    items,
    discount,
    total,
    paid: paidOverride ?? (mode === "Udhaar" ? 0 : total),
    mode,
    customerId,
    customerName: customer?.name ?? "Walk-in Customer",
    staff: number % 3 === 0 ? "Ahmed" : "Ali",
  };
};

export const demoSales: Sale[] = [
  mkSale(1048, daysAgoIso(0, 10, 42), [["pr7", 2], ["pr1", 3], ["pr11", 10]], "Cash", null),
  mkSale(1047, daysAgoIso(0, 10, 15), [["pr3", 2], ["pr4", 1]], "Udhaar", "cu1"),
  mkSale(1046, daysAgoIso(0, 9, 55), [["pr9", 6], ["pr13", 4]], "Cash", null),
  mkSale(1045, daysAgoIso(0, 9, 20), [["pr17", 2], ["pr15", 3]], "Mixed", "cu3", 50, 700),
  mkSale(1044, daysAgoIso(0, 8, 45), [["pr5", 3], ["pr6", 2]], "Cash", "cu5"),
  mkSale(1043, daysAgoIso(1, 19, 10), [["pr8", 12], ["pr12", 20]], "Cash", null),
  mkSale(1042, daysAgoIso(1, 17, 25), [["pr4", 2], ["pr1", 10]], "Udhaar", "cu2"),
  mkSale(1041, daysAgoIso(1, 12, 5), [["pr22", 8]], "Cash", null),
  mkSale(1040, daysAgoIso(2, 18, 30), [["pr16", 2], ["pr18", 2]], "Cash", "cu3"),
  mkSale(1039, daysAgoIso(2, 11, 15), [["pr3", 4]], "Udhaar", "cu4", 100),
  mkSale(1038, daysAgoIso(3, 16, 40), [["pr7", 10], ["pr11", 15]], "Cash", null),
  mkSale(1037, daysAgoIso(4, 13, 20), [["pr5", 2], ["pr2", 6]], "Cash", "cu5"),
  mkSale(1036, daysAgoIso(5, 10, 10), [["pr21", 5], ["pr19", 20]], "Cash", null),
  mkSale(1035, daysAgoIso(6, 15, 45), [["pr6", 3], ["pr13", 6]], "Udhaar", "cu6"),
  mkSale(1034, daysAgoIso(8, 12, 30), [["pr4", 3]], "Cash", "cu7"),
  mkSale(1033, daysAgoIso(11, 14, 5), [["pr3", 6], ["pr1", 20]], "Cash", null),
  mkSale(1032, daysAgoIso(12, 16, 20), [["pr4", 4], ["pr5", 4]], "Udhaar", "cu4"),
  mkSale(1031, daysAgoIso(16, 11, 50), [["pr7", 24]], "Cash", null),
  mkSale(1030, daysAgoIso(21, 10, 35), [["pr18", 6], ["pr15", 10]], "Cash", null),
  mkSale(1029, daysAgoIso(26, 17, 40), [["pr3", 8], ["pr6", 4]], "Cash", null),
];

export const demoPurchases: Purchase[] = [
  {
    id: "pu1",
    invoiceNo: "HT-8842",
    date: daysAgoIso(1, 17, 10),
    supplierId: "sup1",
    supplierName: "Haji Traders",
    items: [
      { productId: "pr1", name: "Sugar 1kg", qty: 40, price: 145 },
      { productId: "pr4", name: "Cooking Oil 5L", qty: 10, price: 2450 },
    ],
    discount: 300,
    total: 40 * 145 + 10 * 2450 - 300,
    paid: 20000,
  },
  {
    id: "pu2",
    invoiceNo: "SD-2291",
    date: daysAgoIso(3, 12, 40),
    supplierId: "sup2",
    supplierName: "Shahzad Distributors",
    items: [
      { productId: "pr7", name: "Coca Cola 1.5L", qty: 48, price: 210 },
      { productId: "pr9", name: "Sting 500ml", qty: 60, price: 95 },
    ],
    discount: 0,
    total: 48 * 210 + 60 * 95,
    paid: 10000,
  },
  {
    id: "pu3",
    invoiceNo: "PA-1130",
    date: daysAgoIso(5, 10, 0),
    supplierId: "sup4",
    supplierName: "Punjab Atta Mills",
    items: [{ productId: "pr3", name: "Atta 10kg", qty: 25, price: 1180 }],
    discount: 500,
    total: 25 * 1180 - 500,
    paid: 22000,
  },
  {
    id: "pu4",
    invoiceNo: "NC-5512",
    date: daysAgoIso(9, 15, 5),
    supplierId: "sup3",
    supplierName: "Nadeem Cosmetics",
    items: [
      { productId: "pr15", name: "Lifebuoy Soap", qty: 36, price: 125 },
      { productId: "pr17", name: "Colgate 140g", qty: 24, price: 285 },
    ],
    discount: 0,
    total: 36 * 125 + 24 * 285,
    paid: 36 * 125 + 24 * 285,
  },
];

export const demoExpenses: Expense[] = [
  { id: "ex1", category: "Tea/Food", amount: 350, date: daysAgoIso(0, 11, 5), note: "Chai staff" },
  { id: "ex2", category: "Transport", amount: 2000, date: daysAgoIso(0, 9, 30), note: "Loader rickshaw" },
  { id: "ex3", category: "Electricity", amount: 8600, date: daysAgoIso(2, 12, 0), note: "Bijli bill September" },
  { id: "ex4", category: "Salary", amount: 25000, date: daysAgoIso(4, 18, 0), note: "Ahmed ki tankhwah" },
  { id: "ex5", category: "Rent", amount: 35000, date: daysAgoIso(6, 10, 0), note: "Dukaan kiraya" },
  { id: "ex6", category: "Other", amount: 1200, date: daysAgoIso(8, 14, 20), note: "Safai samaan" },
  { id: "ex7", category: "Transport", amount: 1500, date: daysAgoIso(12, 11, 40), note: "Maal delivery" },
  { id: "ex8", category: "Tea/Food", amount: 600, date: daysAgoIso(15, 13, 10), note: "Lunch" },
];

export const demoPayments: CreditPayment[] = [
  {
    id: "cp1",
    customerId: "cu1",
    customerName: "Muhammad Bilal",
    amount: 5000,
    date: daysAgoIso(0, 12, 10),
    method: "Cash",
    note: "Jama",
  },
  {
    id: "cp2",
    customerId: "cu2",
    customerName: "Ahmed Raza",
    amount: 3400,
    date: daysAgoIso(0, 13, 25),
    method: "Easypaisa",
    note: "Online",
  },
  {
    id: "cp3",
    customerId: "cu5",
    customerName: "Imran Butt",
    amount: 2000,
    date: daysAgoIso(3, 16, 0),
    method: "Cash",
    note: "",
  },
  {
    id: "cp4",
    customerId: "cu4",
    customerName: "Hafiz Usman",
    amount: 4000,
    date: daysAgoIso(10, 11, 15),
    method: "Bank",
    note: "Transfer",
  },
];

export const demoReturns: ReturnRecord[] = [
  {
    id: "rt1",
    kind: "customer",
    partyName: "Sana Khan",
    productId: "pr18",
    productName: "Surf Excel 1kg",
    qty: 1,
    amount: 590,
    reason: "Packet phata hua tha",
    date: daysAgoIso(1, 15, 30),
    saleId: "sale1040",
  },
  {
    id: "rt2",
    kind: "supplier",
    partyName: "Shahzad Distributors",
    productId: "pr10",
    productName: "Mineral Water 1.5L",
    qty: 6,
    amount: 330,
    reason: "Expiry near",
    date: daysAgoIso(4, 12, 0),
  },
];

export const demoHeldCarts: HeldCart[] = [
  {
    id: "hc1",
    label: "Bilal Bhai",
    items: [item("pr7", 4), item("pr1", 8), item("pr11", 2)],
    customerId: "cu1",
    heldAt: daysAgoIso(0, 10, 23),
  },
  {
    id: "hc2",
    label: "Counter 2",
    items: [item("pr3", 5), item("pr5", 1)],
    customerId: null,
    heldAt: daysAgoIso(0, 10, 31),
  },
];

export const demoStaff: Staff[] = [
  {
    id: "st1",
    name: "Ali",
    role: "Owner",
    pin: "1234",
    active: true,
    permissions: perms([...PERMISSION_KEYS]),
  },
  {
    id: "st2",
    name: "Ahmed",
    role: "Manager",
    pin: "1111",
    active: true,
    permissions: perms([
      "View Sales",
      "Create Sales",
      "Edit Sales",
      "Manage Stock",
      "Manage Customers",
      "Manage Suppliers",
    ]),
  },
  {
    id: "st3",
    name: "Usman",
    role: "Cashier",
    pin: "2222",
    active: true,
    permissions: perms(["View Sales", "Create Sales", "Manage Customers"]),
  },
  {
    id: "st4",
    name: "Kashif",
    role: "Sales Staff",
    pin: "3333",
    active: false,
    permissions: perms(["View Sales", "Create Sales"]),
  },
];

export const demoAudit: AuditEntry[] = [
  { id: "au1", date: daysAgoIso(0, 10, 45), staff: "Ali", action: "New Sale", detail: "Sale #1048 · Rs 2,450" },
  { id: "au2", date: daysAgoIso(0, 10, 41), staff: "Ahmed", action: "Stock Updated", detail: "Sugar 1kg +40" },
  { id: "au3", date: daysAgoIso(0, 10, 30), staff: "Ali", action: "Expense Added", detail: "Transport Rs 2,000" },
  { id: "au4", date: daysAgoIso(0, 9, 58), staff: "Usman", action: "Udhaar Jama", detail: "Muhammad Bilal Rs 5,000" },
  { id: "au5", date: daysAgoIso(1, 19, 12), staff: "Ali", action: "Day Closed", detail: "24 Sep 2026" },
  { id: "au6", date: daysAgoIso(1, 17, 15), staff: "Ahmed", action: "Purchase Added", detail: "Haji Traders HT-8842" },
  { id: "au7", date: daysAgoIso(2, 11, 20), staff: "Ali", action: "Customer Added", detail: "Zainab Bibi" },
  { id: "au8", date: daysAgoIso(3, 16, 45), staff: "Usman", action: "New Sale", detail: "Sale #1038 · Rs 2,850" },
];

export const demoAdjustments: StockAdjustment[] = [
  {
    id: "sa1",
    productId: "pr1",
    productName: "Sugar 1kg",
    change: 40,
    reason: "Nayi kharid",
    date: daysAgoIso(1, 17, 15),
    staff: "Ahmed",
  },
  {
    id: "sa2",
    productId: "pr2",
    productName: "Milk 1L",
    change: -2,
    reason: "Kharab ho gaya",
    date: daysAgoIso(2, 9, 40),
    staff: "Ali",
  },
];

export const demoClosings: DayClosing[] = [
  {
    id: "dc1",
    date: daysAgoIso(1, 21, 0),
    openingCash: 15000,
    cashSales: 41200,
    cashExpenses: 0,
    customerPayments: 3400,
    supplierPayments: 20000,
    expectedCash: 39600,
    actualCash: 39400,
    difference: -200,
    staff: "Ali",
  },
  {
    id: "dc2",
    date: daysAgoIso(2, 20, 45),
    openingCash: 12000,
    cashSales: 28400,
    cashExpenses: 8600,
    customerPayments: 0,
    supplierPayments: 0,
    expectedCash: 31800,
    actualCash: 31800,
    difference: 0,
    staff: "Ali",
  },
];

export const demoNotifications: AppNotification[] = [
  {
    id: "nt1",
    type: "Low Stock",
    title: "Sugar 1kg ka stock kam hai",
    body: "Sirf 12 pcs baqi hain, minimum 15 hai.",
    date: daysAgoIso(0, 10, 5),
    read: false,
  },
  {
    id: "nt2",
    type: "Udhaar",
    title: "Bilal ka Rs 8,450 udhaar baqi hai",
    body: "Aakhri jama 5 din pehle hua tha.",
    date: daysAgoIso(0, 9, 30),
    read: false,
  },
  {
    id: "nt3",
    type: "Daily Closing",
    title: "Aaj ka hisaab close nahi hua",
    body: "Din khatam hone par hisaab close karein.",
    date: daysAgoIso(0, 8, 0),
    read: false,
  },
  {
    id: "nt4",
    type: "Backup",
    title: "Backup 7 din se nahi bana",
    body: "Apna data safe rakhne ke liye backup banayein.",
    date: daysAgoIso(1, 20, 0),
    read: true,
  },
];

export const demoSettings: Settings = {
  storeName: "Al Madina General Store",
  phone: "0300-1234567",
  address: "Main Bazaar, Ichhra, Lahore",
  theme: "light",
  pinLock: true,
  pin: "1234",
  receiptSize: "80mm",
  receiptFooter: "Shukriya! Dobara tashreef layein.",
  showStoreNameOnReceipt: true,
  isDemoMode: true,
};

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Electricity",
  "Transport",
  "Salary",
  "Tea/Food",
  "Other",
];
