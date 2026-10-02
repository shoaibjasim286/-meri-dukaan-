import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  Banknote,
  CalendarCheck,
  CheckCircle2,
  CircleHelp,
  CloudOff,
  DatabaseBackup,
  Download,
  Gauge,
  Globe2,
  KeyRound,
  Lightbulb,
  MonitorSmartphone,
  Package,
  Printer,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Store,
  Truck,
  UsersRound,
  WifiOff,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dukaan/primitives";
import { printElement } from "@/lib/print";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "Meri Dukaan — Guide" },
      {
        name: "description",
        content: "Meri Dukaan app ko step by step samajhne ke liye complete guide.",
      },
      { property: "og:title", content: "Meri Dukaan — Guide" },
      {
        property: "og:description",
        content: "App kaise use karein — step by step.",
      },
    ],
  }),
  component: GuidePage,
});

type GuideSection = {
  id: string;
  title: string;
  icon: LucideIcon;
  content: ReactNode;
  accent?: "default" | "amber";
};

type Step = {
  title: string;
  description: string;
};

const steps = (items: Step[]) => (
  <div className="space-y-3">
    {items.map((item, index) => (
      <div key={item.title} className="flex gap-3 rounded-xl border bg-card p-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">
          {index + 1}
        </span>
        <div className="min-w-0">
          <p className="font-bold">{item.title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
        </div>
      </div>
    ))}
  </div>
);

const tipBox = (children: ReactNode) => (
  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
    <div className="flex gap-2">
      <Lightbulb className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  </div>
);

const successBox = (children: ReactNode) => (
  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
    <div className="flex gap-2">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  </div>
);

const warningBox = (children: ReactNode) => (
  <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
    <div className="flex gap-2">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  </div>
);

const limitations = [
  {
    icon: Smartphone,
    title: "Data sirf ek device par",
    description:
      "App localStorage use karti hai, is liye har device ka data alag hota hai.",
    solution: "Ek device ko apni main dukaan device rakhein.",
  },
  {
    icon: CloudOff,
    title: "Cloud sync nahi hai",
    description:
      "Data automatic cloud par save nahi hota aur multi-device live sync nahi hoti.",
    solution: "Backup file lekar doosre device par restore karein.",
  },
  {
    icon: WifiOff,
    title: "Pehli baar internet zaroori",
    description:
      "Pehli dafa app ko internet ke sath open/install karein. PWA cache ke baad offline chal sakti hai.",
    solution: "Pehli setup ke waqt internet available rakhein.",
  },
  {
    icon: DatabaseBackup,
    title: "Browser data clear = data gone",
    description:
      "Chrome ya browser ka site data clear karne se local app data bhi delete ho sakta hai.",
    solution: "Regular backup download karke safe jagah rakhein.",
  },
  {
    icon: UsersRound,
    title: "Koi login system nahi",
    description:
      "Email/password account system nahi hai. URL jiske paas hai woh app khol sakta hai, lekin browser ka local data separate rehta hai.",
    solution: "Shared device par PIN Lock on rakhein aur access limited rakhein.",
  },
  {
    icon: MonitorSmartphone,
    title: "Multi-device access nahi",
    description:
      "Same live data do devices par automatically available nahi hota.",
    solution: "Backup/restore workflow use karein aur ek main device rakhein.",
  },
  {
    icon: DatabaseBackup,
    title: "Backup manual hai",
    description:
      "Backup automatic schedule par nahi banta.",
    solution: "Har hafte ek backup reminder zaroor rakhein.",
  },
  {
    icon: Printer,
    title: "Print browser par depend",
    description:
      "Printing ka result browser aur printer settings par depend karta hai.",
    solution: "Chrome mein print karke page size aur printer preview check karein.",
  },
  {
    icon: Smartphone,
    title: "Mobile app nahi (PWA hai)",
    description:
      "Ye traditional Play Store/App Store app nahi; PWA hai jo phone ki home screen par install ho sakti hai.",
    solution: "Chrome se Add to Home Screen / Install App use karein.",
  },
  {
    icon: Gauge,
    title: "Pehli baar slow load",
    description:
      "Pehli dafa assets load hone ki wajah se startup slow ho sakta hai.",
    solution: "Cache/service worker ke baad repeat opening aam tor par faster hoti hai.",
  },
  {
    icon: KeyRound,
    title: "PIN bhool = reset",
    description:
      "PIN access recover karna browser data aur saved backup par depend kar sakta hai.",
    solution: "Important data ka backup pehle se rakhein; zaroorat par backup se restore karein.",
  },
  {
    icon: ShieldCheck,
    title: "Staff accounts limited",
    description:
      "Staff roles aur permissions available hain, lekin full enterprise account management system nahi hai.",
    solution: "Har staff ko sirf zaroori permissions dein aur main device protected rakhein.",
  },
  {
    icon: Gauge,
    title: "Scale limit",
    description:
      "Bohat zyada local entries, jaise 10,000+ records, par browser mein performance slow ho sakti hai.",
    solution: "Old data ka backup rakhein aur app ko manageable dataset ke sath use karein.",
  },
  {
    icon: Globe2,
    title: "Browser support",
    description:
      "Modern Chromium browsers, khaas tor par Chrome aur Edge, is app ke liye behtar target hain.",
    solution: "Best experience ke liye current Chrome/Edge version use karein.",
  },
  {
    icon: Banknote,
    title: "Commercial use",
    description:
      "Hosting/service resources ki usage limits hoti hain. Bohat zyada traffic ya larger commercial workload par capacity ki zaroorat barh sakti hai.",
    solution: "Usage grow ho to hosting plan aur app architecture ko review karein.",
  },
];

const faq = [
  {
    q: "Kya mera data cloud mein save hota hai?",
    a: "Nahi. App ka operational data browser ke local storage mein rehta hai. Automatic cloud sync nahi hai.",
  },
  {
    q: "Kya internet band hone par app chal sakti hai?",
    a: "Pehli dafa app ko internet ke sath open/install karein. PWA cache available hone ke baad offline use possible hai.",
  },
  {
    q: "Backup kitni dafa lena chahiye?",
    a: "Kam az kam har hafte. Agar dukaan mein zyada transactions hoti hain to backup aur frequently lena safer hai.",
  },
  {
    q: "Kya main same data mobile aur laptop dono par use kar sakta hoon?",
    a: "Automatic live sync nahi hai. Ek device se backup download karke doosre device par restore karna hoga.",
  },
  {
    q: "PIN Lock ka faida kya hai?",
    a: "PIN Lock same device par app screen ko unauthorized access se protect karne ke liye hai.",
  },
  {
    q: "Kya staff ke liye alag permissions hain?",
    a: "Haan. Staff roles aur permissions available hain, jaise sale, reports, settings, backup aur staff management.",
  },
  {
    q: "Kya print karke receipt ya report nikal sakta hoon?",
    a: "Haan. Jahan Print button available ho, browser print dialog use karke printer ya PDF destination select kar sakte hain.",
  },
  {
    q: "Agar browser ka data clear ho jaye to kya hoga?",
    a: "Local data delete ho sakta hai. Isi liye regular backup sab se important safety step hai.",
  },
  {
    q: "Kya Guide page bhi offline chalega?",
    a: "Haan, PWA cache available hone ke baad Guide page bhi app ke doosre cached pages ki tarah offline open ho sakta hai.",
  },
  {
    q: "Kya app multiple branches ke liye bana hai?",
    a: "Ye version ek simple single-device dukaan workflow ke liye zyada suitable hai. Multi-branch aur cloud-sync requirements ke liye future architecture ki zaroorat ho sakti hai.",
  },
];

const tips = [
  "Har sale complete karne se pehle quantity, customer aur payment mode dobara check karein.",
  "Udhaar customer ka naam aur phone number sahi save karein taa-ke recovery easy rahe.",
  "Har hafte Backup Data se JSON backup download karke safe jagah rakhein.",
  "Daily Closing ko din ke end par routine bana dein aur actual cash count karke close karein.",
  "Low-stock products ko jaldi refill karein taa-ke sale rukay nahi.",
  "PIN Lock on karke shared device par app ko protected rakhein.",
  "Reports ko date range ke sath check karke dukaan ke daily/weekly numbers samjhein.",
  "Agar doosre device par kaam shift karna ho to pehle current device ka backup lein.",
];

function fuzzyTitleMatch(title: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const t = title.toLowerCase();
  if (t.includes(q)) return true;
  return q.split(/\s+/).filter(Boolean).every((part) => t.includes(part));
}

const guideSections: GuideSection[] = [
  {
    id: "section-1",
    title: "Shuru Kaise Karein",
    icon: Store,
    content: (
      <>
        {steps([
          {
            title: "App open/install karein",
            description:
              "Chrome mein Meri Dukaan open karein. Agar app install option aaye to PWA install kar sakte hain.",
          },
          {
            title: "Store name set karein",
            description:
              "Settings → Store Profile mein apni dukaan ka naam, phone aur address save karein.",
          },
          {
            title: "PIN set karein",
            description:
              "Settings → Security mein 4-digit PIN set karein aur zaroorat ke mutabiq PIN Lock ON karein.",
          },
          {
            title: "Pehla product add karein",
            description:
              "Samaan page par jaakar + Add Product use karein aur product ka naam, rate aur stock save karein.",
          },
        ])}
        {tipBox(
          <>
            Pehli setup ke baad ek chhoti test sale karke dekh lein taa-ke workflow clear ho jaye.
          </>,
        )}
      </>
    ),
  },
  {
    id: "section-2",
    title: "Samaan (Products)",
    icon: Package,
    content: (
      <>
        {steps([
          {
            title: "Samaan kholein",
            description: "Sidebar se Samaan select karein.",
          },
          {
            title: "+ Add Product dabayein",
            description: "Naya item banane ke liye Add Product button use karein.",
          },
          {
            title: "Fields bharein",
            description:
              "Item name, category/qism, unit, purchase rate, sale rate aur opening stock jahan required ho wahan enter karein.",
          },
          {
            title: "Save karein",
            description:
              "Save ke baad product list mein nazar aayega aur sale/POS mein use kiya ja sakta hai.",
          },
        ])}
        {successBox(
          <>
            Product rates aur stock ko updated rakhna reports aur munafa samajhne mein help karta hai.
          </>,
        )}
      </>
    ),
  },
  {
    id: "section-3",
    title: "Bikri (Sale / POS)",
    icon: ShoppingCart,
    content: (
      <>
        {steps([
          {
            title: "Bikri kholein",
            description: "Sidebar se Bikri/POS page open karein.",
          },
          {
            title: "Product select karein",
            description:
              "Product search/select karke quantity set karein. Zaroorat ho to multiple items add karein.",
          },
          {
            title: "Customer choose karein",
            description:
              "Walk-in ke liye customer optional ho sakta hai; udhaar sale ke liye customer record zaroor check karein.",
          },
          {
            title: "Payment mode select karein",
            description:
              "Cash, Udhaar ya Mixed mode mein se relevant option choose karein.",
          },
          {
            title: "Complete Sale",
            description:
              "Total aur paid amount check karke Complete Sale dabayein. Sale save hone ke baad stock update hota hai.",
          },
        ])}
        {tipBox(
          <>
            Sale complete karne se pehle cart ki quantity aur payment mode zaroor verify karein.
          </>,
        )}
      </>
    ),
  },
  {
    id: "section-4",
    title: "Customers aur Udhaar",
    icon: UsersRound,
    content: (
      <>
        {steps([
          {
            title: "Customer add karein",
            description:
              "Customers page par naam, phone aur zaroori contact details save karein.",
          },
          {
            title: "Udhaar sale karein",
            description:
              "Bikri mein customer select karke payment mode Udhaar ya Mixed choose karein.",
          },
          {
            title: "Balance dekhein",
            description:
              "Customer ka current udhaar aur activity record check karein.",
          },
          {
            title: "Payment receive karein",
            description:
              "Udhaar payment aane par relevant customer record mein payment add karein.",
          },
        ])}
        {successBox(
          <>
            Customer ka phone number sahi rakhna future payment follow-up ke liye useful hai.
          </>,
        )}
      </>
    ),
  },
  {
    id: "section-5",
    title: "Suppliers aur Kharid",
    icon: Truck,
    content: (
      <>
        {steps([
          {
            title: "Supplier add karein",
            description:
              "Suppliers page par supplier ka naam, phone aur company details save karein.",
          },
          {
            title: "Purchase add karein",
            description:
              "Kharid page par supplier select karke invoice/items, quantity aur purchase prices enter karein.",
          },
          {
            title: "Payment record karein",
            description:
              "Supplier ki outstanding balance check karke supplier payment record karein.",
          },
          {
            title: "Stock verify karein",
            description:
              "Purchase save hone ke baad related products ka stock update check karein.",
          },
        ])}
      </>
    ),
  },
  {
    id: "section-6",
    title: "Kharcha (Expenses)",
    icon: Banknote,
    content: (
      <>
        {steps([
          {
            title: "Kharcha kholein",
            description: "Sidebar se Kharcha open karein.",
          },
          {
            title: "+ Add Expense",
            description: "Naya expense record banane ke liye Add Expense button dabayein.",
          },
          {
            title: "Category aur amount",
            description:
              "Expense category, amount aur available note/details enter karein.",
          },
          {
            title: "Save karein",
            description:
              "Save ke baad expense reports aur hisaab mein include ho jayega.",
          },
        ])}
        {tipBox(
          <>
            Chhote kharchay bhi record karein. Complete records se profit samajhna easy hota hai.
          </>,
        )}
      </>
    ),
  },
  {
    id: "section-7",
    title: "Reports",
    icon: BarChart3,
    content: (
      <>
        {steps([
          {
            title: "Reports open karein",
            description: "Sidebar se Reports page open karein.",
          },
          {
            title: "Date range choose karein",
            description:
              "Today, 7 days, 30 days ya available range ke mutabiq period select karein.",
          },
          {
            title: "Report tabs/cards check karein",
            description:
              "Sales, profit, expense, stock, customer aur supplier related information review karein.",
          },
          {
            title: "Print / Export / Share",
            description:
              "Available actions se report print, CSV/PDF export ya share karein.",
          },
        ])}
        {successBox(
          <>
            Weekly reports ko routine bana kar aap sale aur expense trend ko jaldi samajh sakte hain.
          </>,
        )}
      </>
    ),
  },
  {
    id: "section-8",
    title: "Daily Closing",
    icon: CalendarCheck,
    content: (
      <>
        {steps([
          {
            title: "Daily Closing open karein",
            description: "Din ke end par Daily Closing page par jayein.",
          },
          {
            title: "Expected cash dekhein",
            description:
              "App ke calculated expected cash ko carefully review karein.",
          },
          {
            title: "Actual cash count karein",
            description:
              "Counter par jo actual cash hai woh count karke amount enter karein.",
          },
          {
            title: "Close Day",
            description:
              "Difference check karke Close Day action complete karein.",
          },
        ])}
        {tipBox(
          <>
            Closing se pehle cash sales, customer payments, expenses aur refunds ko ek baar verify kar lein.
          </>,
        )}
      </>
    ),
  },
  {
    id: "section-9",
    title: "Backup (⚠️ Important)",
    icon: DatabaseBackup,
    content: (
      <>
        {warningBox(
          <>
            <p className="font-extrabold">Backup ko routine banayein.</p>
            <p className="mt-1">
              Browser/local data par depend karne wali app mein regular JSON backup sab se important safety step hai.
            </p>
          </>,
        )}
        {steps([
          {
            title: "Settings open karein",
            description: "Sidebar se Settings page open karein.",
          },
          {
            title: "Backup Data use karein",
            description:
              "Data section mein Backup Data / Download Backup option use karein.",
          },
          {
            title: "JSON file safe rakhein",
            description:
              "Downloaded backup file ko aisi jagah rakhein jahan accidentally delete na ho.",
          },
          {
            title: "Har hafte repeat karein",
            description:
              "Regular weekly backup ko apni dukaan ki routine ka hissa bana dein.",
          },
        ])}
      </>
    ),
  },
  {
    id: "section-10",
    title: "PIN aur Security",
    icon: KeyRound,
    content: (
      <>
        {steps([
          {
            title: "Settings → Security",
            description: "Security section open karke PIN options dekhein.",
          },
          {
            title: "4-digit PIN set karein",
            description:
              "Apna PIN enter karke save karein. Simple shared PIN avoid karein.",
          },
          {
            title: "PIN Lock ON karein",
            description:
              "PIN Lock switch ON karke app screen ko lock mode mein use karein.",
          },
          {
            title: "Abhi Lock bhi kar sakte hain",
            description:
              "Jab dukaan temporarily band ho ya aap device chhor rahe hon to Lock App action use karein.",
          },
        ])}
        {warningBox(
          <>
            PIN bhoolne ka scenario avoid karne ke liye backup ko safe rakhein.
          </>,
        )}
      </>
    ),
  },
  {
    id: "section-11",
    title: "App Install Karna (PWA)",
    icon: Smartphone,
    content: (
      <>
        {steps([
          {
            title: "Chrome mein app open karein",
            description:
              "Meri Dukaan ko current Chrome browser mein kholen.",
          },
          {
            title: "Install icon dekhein",
            description:
              "Chrome address bar/menu mein Install App ya similar install option aaye to use choose karein.",
          },
          {
            title: "Settings se bhi check karein",
            description:
              "App ke Settings page par Install App section available ho to wahan se install flow use karein.",
          },
          {
            title: "Home screen / app launcher",
            description:
              "Install ke baad app browser tab ki jagah app-style window ya home screen shortcut se open ho sakti hai.",
          },
        ])}
      </>
    ),
  },
  {
    id: "section-12",
    title: "Offline Kaise Chalayen",
    icon: WifiOff,
    content: (
      <>
        {steps([
          {
            title: "Pehli baar online open karein",
            description:
              "App ko internet ke sath ek baar open karein taa-ke required assets cache ho saken.",
          },
          {
            title: "PWA install karein",
            description:
              "Install App workflow use karna offline usage ko practical banata hai.",
          },
          {
            title: "Offline test karein",
            description:
              "Internet ke baghair app reopen karke check karein ke cached pages expected tarah open ho rahe hain.",
          },
        ])}
        {tipBox(
          <>
            Important data work ke liye backup routine kabhi skip na karein; offline ka matlab cloud backup nahi hota.
          </>,
        )}
      </>
    ),
  },
  {
    id: "section-13",
    title: "Multiple Users / Sharing",
    icon: UsersRound,
    content: (
      <>
        {steps([
          {
            title: "Same URL use ho sakta hai",
            description:
              "Different users same public app URL open kar sakte hain.",
          },
          {
            title: "Data browser/device ke hisaab se separate",
            description:
              "Ek browser/device ka local data doosre user ya doosre device ke local data ke sath automatic merge nahi hota.",
          },
          {
            title: "Staff permissions use karein",
            description:
              "Jahan required ho, Staff page se available roles aur permissions ka use karein.",
          },
          {
            title: "Backup zaroor rakhein",
            description:
              "Device change ya recovery ke liye backup file sab se important bridge hai.",
          },
        ])}
      </>
    ),
  },
  {
    id: "section-14",
    title: "⚠️ LIMITATIONS",
    icon: AlertTriangle,
    accent: "amber",
    content: (
      <>
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-extrabold">Important</p>
              <p className="mt-1 text-sm leading-6">
                In limitations ko samajhna zaroori hai. Agar cloud sync, multi-device, automatic backup chahiye to ye app abhi nahi hai.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {limitations.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-xl border border-amber-200 border-l-4 border-l-amber-500 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:border-l-amber-500 dark:bg-amber-950/20"
              >
                <div className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-extrabold">
                      14.{index + 1} {item.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-amber-900 dark:text-amber-100">
                      💡 Solution: {item.solution}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <div className="flex items-center gap-2 font-extrabold text-emerald-900 dark:text-emerald-100">
              <CheckCircle2 className="size-5" />
              PERFECT FOR
            </div>
            <ul className="mt-3 space-y-2 text-sm text-emerald-900 dark:text-emerald-100">
              <li>✅ Ek chhoti dukaan</li>
              <li>✅ Ek device</li>
              <li>✅ Ek banda</li>
              <li>✅ Regular backup</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
            <div className="flex items-center gap-2 font-extrabold text-rose-900 dark:text-rose-100">
              <XCircle className="size-5" />
              NOT PERFECT FOR
            </div>
            <ul className="mt-3 space-y-2 text-sm text-rose-900 dark:text-rose-100">
              <li>❌ Multiple branches</li>
              <li>❌ Multi-device sync</li>
              <li>❌ Team of 10+</li>
              <li>❌ Automatic cloud backup</li>
            </ul>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "section-15",
    title: "FAQ (Aam Sawalat)",
    icon: CircleHelp,
    content: (
      <div className="space-y-3">
        {faq.map((item, index) => (
          <div key={item.q} className="rounded-xl border bg-card p-4">
            <p className="font-extrabold">
              {index + 1}. {item.q}
            </p>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{item.a}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "section-16",
    title: "Tips aur Tricks",
    icon: Lightbulb,
    content: (
      <div className="space-y-3">
        {tips.map((tip, index) => (
          <div key={tip} className="flex gap-3 rounded-xl border bg-card p-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-extrabold text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
              {index + 1}
            </span>
            <p className="text-sm leading-6">{tip}</p>
          </div>
        ))}
        {successBox(
          <>
            Best habit: <strong>Backup + Daily Closing + clean customer records</strong> ko regular routine bana dein.
          </>,
        )}
      </div>
    ),
  },
];

function GuidePage() {
  const [query, setQuery] = useState("");
  const [openSections, setOpenSections] = useState<string[]>(["section-1"]);

  const filteredSections = useMemo(
    () =>
      guideSections.filter((section) => fuzzyTitleMatch(section.title, query)),
    [query],
  );

  const allSectionIds = useMemo(() => guideSections.map((section) => section.id), []);

  const handlePrint = () => {
    setOpenSections(allSectionIds);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        printElement("guide-print-area");
      });
    });
    window.setTimeout(() => {
      setOpenSections(["section-1"]);
    }, 2200);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Meri Dukaan — Guide"
        subtitle="App kaise use karein — step by step"
        actions={
          <Button
            variant="outline"
            className="no-print rounded-xl"
            onClick={handlePrint}
          >
            <Printer className="size-4" /> Print Guide
          </Button>
        }
      />

      <div className="no-print rounded-2xl border bg-card p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Guide mein search karein..."
            aria-label="Guide search"
            className="pl-9"
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {query
              ? `${filteredSections.length} section match hua`
              : `${guideSections.length} sections available`}
          </p>
          {query ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQuery("")}
              className="rounded-lg"
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      <div
        id="guide-print-area"
        data-print-format="report"
        className="space-y-3"
      >
        <div className="print-only">
          <h1 className="text-2xl font-bold">Meri Dukaan — Guide</h1>
          <p className="text-sm">App kaise use karein — step by step</p>
        </div>

        {filteredSections.length === 0 ? (
          <div className="rounded-2xl border bg-card p-6 text-center">
            <Search className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-bold">Koi section nahi mila</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Search mein section ka title ya simple keyword try karein.
            </p>
          </div>
        ) : (
          <Accordion
            type="multiple"
            value={openSections}
            onValueChange={setOpenSections}
            className="rounded-2xl border bg-card px-4 sm:px-5"
          >
            {filteredSections.map((section) => {
              const Icon = section.icon;
              return (
                <AccordionItem
                  key={section.id}
                  value={section.id}
                  className={cn(
                    section.id === "section-14"
                      ? "border-amber-300 dark:border-amber-900/60"
                      : "",
                  )}
                >
                  <AccordionTrigger
                    className={cn(
                      "gap-3 py-4 hover:no-underline sm:py-5",
                      section.accent === "amber"
                        ? "text-amber-900 dark:text-amber-100"
                        : "",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-xl",
                        section.accent === "amber"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                          : "bg-primary-soft text-primary",
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-left text-sm font-extrabold sm:text-base">
                        {section.title}
                      </span>
                      <span className="mt-0.5 block text-left text-xs font-medium text-muted-foreground">
                        Section {section.id.replace("section-", "")}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 pt-1 sm:pb-6">
                    {section.content}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        <div className="print-only mt-5 text-xs text-muted-foreground">
          <p>Guide print: Meri Dukaan</p>
        </div>
      </div>
    </div>
  );
}
