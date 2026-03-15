import json
import os

files = [
    'c:/Code/CartBuddy/cartbuddytool-fe/app/i18n/en.json',
    'c:/Code/CartBuddy/cartbuddytool-fe/app/i18n/lt.json'
]

new_en = {
    "title": "Create New Project",
    "subtitle": "Enter your website URL to set up a new project",
    "backToDashboard": "Back to Dashboard",
    "invalidUrl": "Please enter a valid URL (e.g. https://example.com)",
    "invalidUrlDomain": "Invalid domain",
    "websiteExistsTitle": "Website Exists",
    "websiteExistsMessage": "This website is already added. Please manage it from your dashboard.",
    "scanningSitemap": "Scanning sitemap...",
    "foundUrls": "Found {{count}} URLs",
    "existingData": {
        "title": "Existing Data Found",
        "description": "We found existing scraped data for this domain ({{domain}}). Would you like to use it or perform a new scan?",
        "useExisting": "Use Existing Data",
        "rescan": "Rescan Website"
    },
    "selection": {
        "title": "Select Pages to Scrape",
        "foundPages": "Found {{count}} pages via {{method}}",
        "methodCrawling": "web crawling",
        "methodSitemap": "sitemap",
        "selectedCount": "{{count}} selected",
        "pleaseSelectUrl": "Please select at least one URL",
        "urlAlreadyInList": "This URL is already in the list",
        "searchPlaceholder": "Search URLs...",
        "selectAll": "Select All",
        "deselectAll": "Deselect All",
        "selectFiltered": "Select {{count}} Filtered",
        "deselectFiltered": "Deselect {{count}} Filtered",
        "showBlacklist": "Show Blacklist ({{count}} patterns)",
        "hideBlacklist": "Hide Blacklist ({{count}} patterns)",
        "urlHeader": "URL",
        "noUrlsSearch": "No URLs match your search",
        "noUrlsFound": "No URLs found",
        "blacklisted": "Blacklisted",
        "removeUrl": "Remove from list",
        "showingCount": "Showing {{showing}} of {{total}}",
        "addUrlPlaceholder": "https://example.com/page",
        "add": "Add URL",
        "next": "Continue ({{count}} selected)",
        "tips": {
            "title": "Tips for selection:",
            "selectMain": "Select the main pages:",
            "selectMainDesc": "Home, About, Contact, Services, FAQs, and Product pages.",
            "skipPosts": "Skip dynamic pages:",
            "skipPostsDesc": "Blog posts, news articles, or pages that are frequently updated.",
            "focusStatic": "Focus on static content:",
            "focusStaticDesc": "Pages that contain the core information about your business.",
            "useBlacklist": "Use the blacklist:",
            "useBlacklistDesc": "To automatically exclude pages that contain certain keywords in the URL."
        },
        "pathGroups": "Path Groups",
        "blacklist": {
            "title": "URL Blacklist Patterns",
            "description": "Any URL containing these patterns will be automatically excluded.",
            "placeholder": "Pattern (e.g. /blog/)",
            "patternExists": "This pattern is already in the blacklist",
            "patternAdded": "Added pattern '{{pattern}}'. Selected {{removed}} filtered URLs.",
            "patternRemoved": "Pattern removed",
            "quickAdd": "Quick Select"
        }
    },
    "mainSelection": {
        "title": "Select Main URLs",
        "description": "Choose up to 10 URLs to be used as main URLs. These will be added to the Master Prompt for immediate availability.",
        "searchPlaceholder": "Search selected URLs...",
        "selectAll": "Select All",
        "deselectAll": "Deselect All",
        "smartSelect": "Smart Select",
        "urlHeader": "URL",
        "typeHeader": "Type",
        "typeMain": "Main Text",
        "typeVectorized": "Vectorized",
        "noUrlsSearch": "No URLs match your search",
        "noUrls": "No URLs available",
        "back": "Back to Selection",
        "scrape": "Scrape {{count}} URLs",
        "maxMainPages": "You can select a maximum of 10 main pages. Please untick a page to select a new one.",
        "maxMainPagesBulk": "You can only select up to 10 main pages. Only the first selected pages will be marked as main.",
        "tips": {
            "title": "Tips for Main URLs:",
            "alwaysAvailable": "Always Available",
            "alwaysAvailableDesc": "Content from Main URLs is injected directly into the prompt without semantic search.",
            "staticContent": "Best for Core Info",
            "staticContentDesc": "Use for homepage, contact, FAQ, or core services.",
            "essentialPages": "Keep it Essential",
            "essentialPagesDesc": "More main text increases cost and latency. Choose only the most critical pages.",
            "limitRec": "Limits",
            "limitRecDesc": "Max 10 pages recommended for main text."
        }
    },
    "scrapingTips": {
        "title": "Tips for Successful Scraping:",
        "tip1": "Large websites may take some time. Please be patient.",
        "tip2": "If a page fails, you can retry it later from the project dashboard.",
        "tip3": "Make sure your website responds quickly and doesn't aggressively block scrapers.",
        "tip4": "You don't need to select every single page, only those with useful information for your chatbot.",
        "tip5": "You can add more URLs or remove scraped URLs after the initial scraping is done.",
        "tip6": "Ensure that your API key is correctly configured."
    }
}

new_lt = {
    "title": "Sukurti naują projektą",
    "subtitle": "Įveskite savo svetainės adresą, kad sukurtumėte naują projektą",
    "backToDashboard": "Atgal į pagrindinį",
    "invalidUrl": "Įveskite tinkamą URL (pvz.: https://example.com)",
    "invalidUrlDomain": "Neteisingas domenas",
    "websiteExistsTitle": "Svetainė jau egzistuoja",
    "websiteExistsMessage": "Ši svetainė jau pridėta. Prašome valdyti ją iš pagrindinio puslapio.",
    "scanningSitemap": "Skenuojamas svetainės medis...",
    "foundUrls": "Rasta {{count}} URL",
    "existingData": {
        "title": "Rasta esamų duomenų",
        "description": "Radome anksčiau nuskaitytų duomenų šiam domenui ({{domain}}). Ar norite juos naudoti, ar nuskaityti iš naujo?",
        "useExisting": "Naudoti esamus",
        "rescan": "Nuskaityti iš naujo"
    },
    "selection": {
        "title": "Pasirinkite puslapius nuskaitymui",
        "foundPages": "Rasta {{count}} puslapių per {{method}}",
        "methodCrawling": "naršymą (crawling)",
        "methodSitemap": "svetainės medį (sitemap)",
        "selectedCount": "{{count}} pasirinkta",
        "pleaseSelectUrl": "Pasirinkite bent vieną URL",
        "urlAlreadyInList": "Šis URL jau yra sąraše",
        "searchPlaceholder": "Ieškoti URL...",
        "selectAll": "Pažymėti visus",
        "deselectAll": "Atžymėti visus",
        "selectFiltered": "Pažymėti {{count}} išfiltruotus",
        "deselectFiltered": "Atžymėti {{count}} išfiltruotus",
        "showBlacklist": "Rodyti blokuotųjų sąrašą ({{count}})",
        "hideBlacklist": "Slėpti blokuotųjų sąrašą ({{count}})",
        "urlHeader": "URL",
        "noUrlsSearch": "Nerasta atitinkančių URL",
        "noUrlsFound": "URL nerasta",
        "blacklisted": "Blokuota",
        "removeUrl": "Pašalinti iš sąrašo",
        "showingCount": "Rodoma {{showing}} iš {{total}}",
        "addUrlPlaceholder": "https://example.com/puslapis",
        "add": "Pridėti URL",
        "next": "Tęsti ({{count}} pažymėta)",
        "tips": {
            "title": "Patarimai atrankai:",
            "selectMain": "Pasirinkite pagrindinius:",
            "selectMainDesc": "Pagrindinis, Apie mus, Kontaktai, Paslaugos, DUK, ir Produktų puslapiai.",
            "skipPosts": "Praleiskite kintančius:",
            "skipPostsDesc": "Tinklaraščio įrašai, naujienos, ar dažnai atnaujinami puslapiai.",
            "focusStatic": "Fokusuokitės į statinį turinį:",
            "focusStaticDesc": "Puslapiai pateikiantys bazinę informaciją apie jūsų verslą.",
            "useBlacklist": "Naudokite blokuotųjų sąrašą:",
            "useBlacklistDesc": "Automatiškai atmesti URL pagal raktažodžius."
        },
        "pathGroups": "URL Grupės",
        "blacklist": {
            "title": "Blokuojami URL šablonai",
            "description": "URL turintys šiuos raktinius žodžius bus automatiškai atmesti.",
            "placeholder": "Šablonas (pvz. /blog/)",
            "patternExists": "Šis šablonas jau yra sąraše",
            "patternAdded": "Pridėta '{{pattern}}'. Atžymėta {{removed}} filtruojamų URL.",
            "patternRemoved": "Šablonas pašalintas",
            "quickAdd": "Greitas Pridėjimas"
        }
    },
    "mainSelection": {
        "title": "Pasirinkite Pagrindinius URL",
        "description": "Pasirinkite iki 10 URL kaip pagrindinius. Jie bus pasiekiami agentui pagrindiniame užklausime (Prompt).",
        "searchPlaceholder": "Ieškoti tarp pasirinktų URL...",
        "selectAll": "Pažymėti visus",
        "deselectAll": "Atžymėti visus",
        "smartSelect": "Išmanus pasirinkimas",
        "urlHeader": "URL",
        "typeHeader": "Tipas",
        "typeMain": "Pagrindinis",
        "typeVectorized": "Vektorizuotas",
        "noUrlsSearch": "Nerasta atitinkančių URL",
        "noUrls": "Nėra pasirinktų URL",
        "back": "Atgal",
        "scrape": "Nuskaityti {{count}} URL",
        "maxMainPages": "Daugiausia galima pasirinkti 10 pagrindinių puslapių.",
        "maxMainPagesBulk": "Pridėti tik pirmieji atitinkantys, nes limitas yra 10 pagrindinių puslapių.",
        "tips": {
            "title": "Patarimai Pagrindiniams URL:",
            "alwaysAvailable": "Visada pasiekiami",
            "alwaysAvailableDesc": "Turinys agentui pateikiamas iškart be paieškos.",
            "staticContent": "Geriausia Bazinei Info",
            "staticContentDesc": "Pasirinkite Pagrindinį, Kontaktų, DUK ir paslaugų puslapius.",
            "essentialPages": "Tik Svarbiausia",
            "essentialPagesDesc": "Kiekvienas pagrindinis puslapis padidina užklausos kainą.",
            "limitRec": "Limitai",
            "limitRecDesc": "Rekomenduojama iki 10 pagrindinių puslapių."
        }
    },
    "scrapingTips": {
        "title": "Nuskaitymo Patarimai:",
        "tip1": "Didelės svetainės gali užtrukti.",
        "tip2": "Nepavykus, vėliau galėsite pakartoti iš projekto panelės.",
        "tip3": "Įsitikinkite, kad svetainė neblokuoja robotų.",
        "tip4": "Nereikia skenuoti viso turinio trumpalaikėms naujienoms.",
        "tip5": "Vėliau galėsite pridėti ar trinti URL.",
        "tip6": "Įsitikinkite API raktų teisingumu."
    }
}

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if 'en.json' in file_path:
        data['new'] = new_en
    else:
        data['new'] = new_lt
        
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

print("Translations added successfully!")
