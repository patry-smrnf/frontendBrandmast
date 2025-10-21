import React, {useState, useRef, useCallback, useMemo} from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ContextMenu from "@/components/contextMenu";

const faqs = [
  {
    question: "Kod SMS/Mail nie dochodzi",
    answer:
      <>
      <span className="font-semibold text-white">1)</span> Sprawdzamy poprawnosc danych ( bledy typu @gnail zamiast @gmail )<br />
      <span className="font-semibold text-white">2)</span> Dzwonimy do IT w celach weryfikacji dostepnosci oferty
      </>
  },
  {
    question: "Bledny kod MYGLO",
    answer:
      <>
        Wchodzimy w <span className="font-semibold text-white">Aplikacje121 - Wysylki - Zgloszenia BM</span> <br />
        W rodzaj zgloszenia klikamy 'Bledny numer myGLO', wpisujemy kod z urzadzdenia ktory nie przechodzi - po zatwierdzeniu strona wypisuje awaryjny kod urzadzenia ktory wpisujemy w webform
      </>
  },
  {
    question: "Blad przy konczeniu rejestracji",
    answer:
      <>
        Czasami gdy juz jest klient zweryfikowany, numery myGLO i oferta wpisane - podczas konczenia rejestracji nastapuje blad np. <span className="font-semibold text-white">"Wystapil blad podczas rejestracji. Zweryfikuj dane i sprobuj ponownie"</span> <br/>
        <br/><span className="font-semibold text-white">1) Zapisujemy dane klienta</span> czyli mail + nr telefonu <br />
        <span className="font-semibold text-white">2) Robimy zdjecie paragonu telefonem/tabletem</span> przyda sie przy wysylaniu zgloszenia <br />
        <span className="font-semibold text-white">3) Wchodzimy na "aplikacje121 / wysylki / zgloszenia BM</span> klikamy opcje 'Nowy' wybieramy rodzaj zgloszenia 'Blad systemu'<br />
        <span className="font-semibold text-white">4) Uzupelniamy formularz zgloszenia</span> wypelniamy event, kod bledu ( jesli go brak w powiadomieniu na tablecie to po prostu 'blad wysylania'), region, adres email, oferta oraz w <span className="font-semibold text-white">Uwagi opcjonalne dodajemy nr telefonu klienta</span><br />


      </>
  },
  {
    question: "Gdzie moge znalezc numer ackji?",
    answer:(
      <>
        W zakladce 'Akcje' w Tourplanner klikamy obecnie trwajaca akje, wtedy pod nazwa akcji mamy napisany 'ID akcji' bedzie wygladal jak 000000/A/2025, obchodzi nas jedynie poczatek czyli same 000000
      </>
    )
  },
  {
    question: "Klient ma wykorzystana oferte, czy moge na kasjerke?",
    answer:(
      <>
        Jest <span className="font-semibold text-white">ZAKAZ rejestrowania urzadzenia na kogos innego niz klient z ktorym rozmawiamy</span> natychmiastowy negatywny wynik u tajemniczego klienta. Nie boj sie wyblagac kasjerke o zrobienie zwrotu urzadzenia ktore klient kupil, lecz na przyszlosc <span className="font-semibold text-white"> wpierw nalezy weryfikowac dostepnosc ofert</span>
      </>
    )
  },
    {
    question: "Jaki wybrac event? Co to Traditional Trade",
    answer:
      <>
      W wiekszosci przypadkow nazwy sklepu w ktorym jestesmy wskazuja jaki event, lecz sa przypadki gdzie nie do konca <br/><br/>
      <span className="font-semibold text-white">Traditional Trade ( TT ) - </span> Sklepu typu carrefour express, kiosk u pani krysi - czyli sklepy niezalezne<br />
      </>
  },
];


export default function BMHelperPage() {
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [query, setQuery] = useState("");
    const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);
    const filteredFaqs = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return faqs;
      return faqs.filter((f) => f.question.toLowerCase().includes(q));
    }, [query]);
    return (
        <>
            {/* Context menu button */}
            <div ref={menuRef} className="fixed top-4 right-4 z-50" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={toggleMenu} 
          aria-expanded={menuOpen}
          aria-haspopup="true"
          aria-controls="stats-context-menu"
          aria-label={menuOpen ? "Zamknij menu" : "Otwórz menu"}
          className="w-10 h-10 bg-white/90 hover:bg-white text-gray-800 rounded-full shadow-md flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-500" 
          type="button"
        >
          <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
        {menuOpen && (
          <div id="stats-context-menu" role="menu" aria-label="Panel akcji">
            <ContextMenu closeMenu={() => setMenuOpen(false)} type="BM" />
          </div>
        )}
      </div>
    <div className="min-h-screen relative text-white flex flex-col items-center p-4 sm:p-6">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(60rem_40rem_at_50%_-10%,rgba(120,119,198,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(40rem_30rem_at_80%_120%,rgba(16,185,129,0.10),transparent)]" />
      </div>

      {/* Header */}
      <div className="w-full max-w-2xl">
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-white/95">BM Help Center</h2>
            <span className="text-xs sm:text-sm text-zinc-400">{filteredFaqs.length} wyników</span>
          </div>
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj pytania..."
              aria-label="Szukaj w FAQ"
              className="w-full rounded-xl bg-zinc-900/60 border border-zinc-800 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/60 outline-none text-sm placeholder:text-zinc-500 px-10 py-2.5 transition"
              type="text"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l3.89 3.889a1 1 0 01-1.415 1.415l-3.889-3.89zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-2xl">
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {filteredFaqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 hover:bg-zinc-900/70 transition-colors backdrop-blur supports-[backdrop-filter]:bg-zinc-900/40 shadow-sm"
            >
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value={`faq-${index}`}>
                  <AccordionTrigger className="px-4 py-3 text-[0.95rem] font-medium text-white hover:no-underline">
                    <div className="w-full flex items-center gap-3">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-zinc-300 text-xs border border-zinc-700">{index + 1}</span>
                      <span className="flex-1 text-left leading-tight">{faq.question}</span>
                      <svg className="h-4 w-4 text-zinc-400 transition-transform duration-200 data-[state=open]:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-3 pt-0 text-sm leading-relaxed text-zinc-300">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          ))}
        </div>
      </div>
    </div>
        </>
    )
}