// "O Związku": the federation's own account of itself, shown in AboutDialog.
//
// Taken from https://pzsurf.pl/zwiazek/o-nas/ (the old WordPress site, page
// last edited 2026-03-07) in September 2026, when pzsurf.pl moved to this
// site. It lives HERE, in the repo, because the platform has no field for it:
// everything else on the page comes from the public API, this does not. Edit
// it in this file.
//
// Wording as published, apart from plain typos fixed on the way in
// (Asosiation, "aktywny członkiem", "sprawił", "integracja", "Surfing,",
// "tym samy droge", "piewsze", a doubled closing quote, a capital
// "Organizuje" mid-sentence, repeated spaces). \u00a0 is a no-break space,
// kept from the source: Polish typesetting keeps a one-letter word ("w", "i",
// "o") off the end of a line. A "\n" inside a paragraph is a line break the
// source had.

export interface Milestone {
  /** As the source writes it: "Lata ’80", "08.2006", "29.11.2018", "2024". */
  when: string;
  text: string;
}

export const ABOUT_INTRO: string[] = [
  "Polski Związek Surfingu to organizacja zrzeszająca kluby sportowe, zawodników i\u00a0organizacje związane z\u00a0rozwojem wszystkich odmian surfingu na\u00a0terenie Polski.\nZwiązek powstał z\u00a0idei pasjonatów i\u00a0prekursorów surfingu w Polsce, aby wspólnie rozwijać polski surfing na\u00a0poziomie sportowym i\u00a0rekreacyjnym. Aby poziom polskiego surfingu nieustannie wzrastał i\u00a0niósł nieprzemijającą radość i\u00a0kulturę surfingową związaną z\u00a0równowagą życia, zdrowia, sportu i\u00a0uczciwego współzawodnictwa. \nPolski Związek Surfingu jest wieloletnim aktywnym członkiem Międzynarodowej Federacji Surfingu (International Surfing Association, w\u00a0skrócie ISA) i\u00a0reprezentuje na\u00a0terenie Polski wszystkie odmiany surfingu: Surf, Longboard, Stand Up Paddleboard (SUP), Bodysurf.",
  "Buduj z\u00a0nami polski surfing! #surfpl",
];

export const ABOUT_HISTORY: string[] = [
  "Idea powołania Polskiego Związku Surfingu powstała wiele lat temu. Protoplastami w\u00a0przecieraniu ścieżek i\u00a0tworzeniu struktur surfingu w\u00a0Polsce są przede wszystkim Jurek Kijkowski, Wojtek Ochrymowicz i\u00a0Maciej Krystosiak. To te osoby były główną siłą napędową początków profesjonalizacji polskiego surfingu tworząc wspólnie z\u00a0innymi członkami Polskie Stowarzyszenie Surfingu, pozyskując akredytację International Surfing Association (ISA) na terenie Polski.\nCoraz większe zainteresowanie surfingiem i\u00a0jego różnymi odmianami w\u00a0ostatnich latach sprawiło, że szereg stowarzyszeń i\u00a0osób podejmowało działania na\u00a0rzecz profesjonalizacji dyscypliny i\u00a0poprawy bezpieczeństwa osób uprawiających ją. W\u00a0ten sposób narodziła się idea Polskiego Związku Surfingu.",
  "W 2020 roku Związek Sportowy Surfingu został oficjalnie zarejestrowany w\u00a0Krajowym Rejestrze Sądowym, jako podmiot mający na\u00a0celu integrację środowiska i\u00a0uzyskanie akredytacji Ministerstwa Kultury, Dziedzictwa Narodowego i\u00a0Sportu w\u00a0celu przekształcenia się w\u00a0Polski Związek Surfingu.",
  "Pod koniec 2020 roku Polskie Stowarzyszenie Surfingu przekazało swoje członkostwo w\u00a0Międzynarodowej Federacji Surfingu (ISA) na\u00a0Związek Sportowy Surfingu, otwierając tym samym drogę do\u00a0dalszego rozwoju dyscypliny w\u00a0kraju.",
];

/** Oldest first, as the source lists them. Several share a year (2024 has
 *  three); they are separate milestones, not duplicates. */
export const ABOUT_TIMELINE: Milestone[] = [
  { when: "Lata ’80", text: "Legendy o\u00a0pierwszych próbach łapania fali na\u00a0deskach windsurfingowych na\u00a0polskim wybrzeżu" },
  { when: "Lata ’90", text: "Początki prawdziwego surfingu na\u00a0polskim wybrzeżu." },
  { when: "08.2006", text: "Pierwsze zawody surfingowe w\u00a0Polsce – Polish Surfing Challenge, które następnie stały się nieoficjalnymi Mistrzostwami Polski i\u00a0do dnia dzisiejszego wyłaniały najlepszych polskich surferów i\u00a0surferki" },
  { when: "30.08.2006", text: "Rejestracja Polskiego Stowarzyszenia Surfingu" },
  { when: "2016", text: "Pierwsze rozmowy i\u00a0spotkania na\u00a0temat powołania Polskiego Związku Surfingowego i\u00a0jego idei." },
  { when: "2017", text: "Cold Water Jam – Pierwsze zawody surfingowe w\u00a0woj. Pomorskim poza Mistrzostwami Polski i\u00a0pierwsze w\u00a0Polsce o\u00a0charakterze „coldwaterowym”" },
  { when: "2018", text: "West Coast Battle – Pierwsze zawody surfingowe na\u00a0zachodniej części polskiego wybrzeża stając się nieoficjalnie Mistrzostwami Pomorza Zachodniego" },
  { when: "29.11.2018", text: "Pierwsze spotkanie założycielskie i\u00a0powołanie Związku Surfingu w\u00a0Polsce" },
  { when: "6.06.2020", text: "Drugie spotkanie założycielskie i\u00a0powołanie Związku Sportowego Surfingu – organizacji, która będzie starała się o\u00a0przekształcenie w\u00a0związek narodowy z\u00a0nadania ministra właściwego i\u00a0utworzenie Polskiego Związku Surfingu" },
  { when: "20.06.2020", text: "Oficjalna Rejestracja Związku Sportowego Surfingu w\u00a0Krajowym Rejestrze Sądowym" },
  { when: "01.01.2021", text: "Związek Sportowy Surfingu – staje się oficjalnym narodowym przedstawicielem Polski z\u00a0ramienia ISA (International Surfing Association)" },
  { when: "15.09.2022", text: "Polski Związek Surfingu zostaje oficjalnie zarejestrowany w\u00a0Krajowym Rejestrze Sądowym." },
  { when: "13.10.2022", text: "Polski Związek Surfingu zostaje oficjalnie Polskim Związkiem Sportowym w\u00a0rozumieniu Ustawy o\u00a0Sporcie zarejestrowany w\u00a0Krajowym Rejestrze Sądowym." },
  { when: "2022", text: "Polski Związek Surfingu organizuje oficjalne Mistrzostwa Polski (dyrektor Jan Sadowski), które rekordowo przyciągają 80-ciu zawodników i\u00a0trwają 2 dni we Władysławowie." },
  { when: "2023", text: "Polski Związek Surfingu realizuje pierwszy program szkoleniowy przy wsparciu środków publicznych z\u00a0Ministerstwa Sportu i\u00a0Turystyki („Przygotowanie zawodników kadry narodowej do\u00a0udziału w\u00a0igrzyskach olimpijskich oraz przygotowania i\u00a0udział w\u00a0mistrzostwach świata i\u00a0Europy w\u00a0sportach olimpijskich w\u00a02023 roku”)" },
  { when: "2024", text: "Polski Związek Surfingu realizuje pierwszy program szkoleniowy dla Kadry Narodowej Juniorów przy wsparciu środków publicznych z\u00a0Ministerstwa Sportu i\u00a0Turystyki" },
  { when: "2024", text: "Reprezentacja Polski złożona z\u00a0zawodników Kadry Narodowej 8-ym zespołem z\u00a0Europy na\u00a0Mistrzostwach Świata w\u00a0Surfingu w\u00a0Portoryko!" },
  { when: "2024", text: "Reprezentantka Polski Emma Ridolfini zajmuje 7-me miejsce na\u00a0Mistrzostwach Europy U14 w\u00a0Hiszpanii!" },
  { when: "08.2025", text: "Mistrzostwa Polski w\u00a0Surfingu 2025 w\u00a0Chałupach: mistrzami Polski w\u00a0shortboardzie zostają Jakub Kuzia i\u00a0Julia Szulikowska, a\u00a0Emma Ridolfini wygrywa kategorie U16 i\u00a0U18 dziewcząt." },
  { when: "09.2025", text: "Reprezentacja Polski startuje w\u00a0Mistrzostwach Świata ISA World Surfing Games 2025 w\u00a0Salwadorze, wśród 61\u00a0krajów." },
  { when: "12.2025", text: "Polish SUP Tour zostaje oficjalnym Pucharem Polski SUP pod egidą Polskiego Związku Surfingu – pierwszy od\u00a0lat spójny, ogólnopolski cykl zawodów SUP." },
  { when: "09.2026", text: "Mistrzostwa Polski w\u00a0Surfingu 2026 w\u00a0Chałupach: Emma Ridolfini potrójną mistrzynią Polski – wygrywa shortboard open kobiet oraz kategorie U18 i\u00a0U16 dziewcząt!" },
  { when: "09.2026", text: "Zawodnicy RTW Racibórz na\u00a0podium klasyfikacji generalnej Pucharu Europy SUP w\u00a0kategorii U16: Lena Nowak – 1. miejsce, Maja Bauerek – 2. miejsce, Mikołaj Milczek – 3. miejsce!" },
];

/** Where the timeline ends: not a date but a direction. */
export const ABOUT_FUTURE = "Wspólnie tworzymy i\u00a0rozwijamy polski surfing #surfpl";
