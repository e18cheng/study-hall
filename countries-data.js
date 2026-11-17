// Geography datasets: regions, territories, capitals, and map-shape fixups.
// Loaded before app.js; app.js builds the lookup tables from these at startup.

// ---------------------------------------------------------------------------
// Regions. Edit freely: "code Name|alias|alias; ..." (code = ISO 3166 numeric,
// as used by world-atlas). Aliases are extra accepted answers in typing mode.
// ---------------------------------------------------------------------------
const REGION_DEFS = [
  ['Americas', [
    ['na', 'North America', '124 Canada; 840 United States|usa|us|america|united states of america; 484 Mexico'],
    ['ca', 'Central America', '084 Belize; 320 Guatemala; 340 Honduras; 222 El Salvador; 558 Nicaragua; 188 Costa Rica; 591 Panama'],
    ['cb', 'Caribbean', '192 Cuba; 388 Jamaica; 332 Haiti; 214 Dominican Republic|dominican rep|dr; 044 Bahamas; 780 Trinidad and Tobago|trinidad; 052 Barbados; 662 Saint Lucia; 670 Saint Vincent and the Grenadines|saint vincent; 308 Grenada; 028 Antigua and Barbuda|antigua; 212 Dominica; 659 Saint Kitts and Nevis|saint kitts'],
    ['sa', 'South America', '032 Argentina; 068 Bolivia; 076 Brazil; 152 Chile; 170 Colombia; 218 Ecuador; 328 Guyana; 600 Paraguay; 604 Peru; 740 Suriname; 858 Uruguay; 862 Venezuela'],
  ]],
  ['Europe', [
    ['neu', 'Northern Europe', '352 Iceland; 578 Norway; 752 Sweden; 246 Finland; 208 Denmark; 233 Estonia; 428 Latvia; 440 Lithuania; 826 United Kingdom|uk|britain|great britain|england; 372 Ireland'],
    ['weu', 'Western Europe', '250 France; 056 Belgium; 528 Netherlands|holland; 442 Luxembourg; 276 Germany; 756 Switzerland; 040 Austria; 438 Liechtenstein; 492 Monaco'],
    ['seu', 'Southern Europe', '620 Portugal; 724 Spain; 020 Andorra; 380 Italy; 674 San Marino; 336 Vatican City|vatican|holy see; 470 Malta; 300 Greece; 196 Cyprus'],
    ['bal', 'Balkans', '705 Slovenia; 191 Croatia; 070 Bosnia and Herzegovina|bosnia; 688 Serbia; 499 Montenegro; XK Kosovo; 008 Albania; 807 North Macedonia|macedonia; 100 Bulgaria'],
    ['eeu', 'Eastern Europe', '616 Poland; 203 Czechia|czech republic; 703 Slovakia; 348 Hungary; 642 Romania; 498 Moldova; 804 Ukraine; 112 Belarus; 643 Russia'],
  ]],
  ['Asia', [
    ['me', 'Middle East', '792 Turkey|turkiye; 760 Syria; 422 Lebanon; 376 Israel; 275 Palestine; 400 Jordan; 368 Iraq; 364 Iran; 682 Saudi Arabia; 414 Kuwait; 048 Bahrain; 634 Qatar; 784 United Arab Emirates|uae; 512 Oman; 887 Yemen'],
    ['cas', 'Caucasus & Central Asia', '268 Georgia; 051 Armenia; 031 Azerbaijan; 398 Kazakhstan; 860 Uzbekistan; 795 Turkmenistan; 417 Kyrgyzstan; 762 Tajikistan'],
    ['sas', 'South Asia', '004 Afghanistan; 586 Pakistan; 356 India; 524 Nepal; 064 Bhutan; 050 Bangladesh; 144 Sri Lanka; 462 Maldives'],
    ['eas', 'East Asia', '156 China; 496 Mongolia; 408 North Korea; 410 South Korea; 392 Japan; 158 Taiwan'],
    ['sea', 'Southeast Asia', '104 Myanmar|burma; 764 Thailand; 418 Laos; 116 Cambodia; 704 Vietnam; 458 Malaysia; 702 Singapore; 360 Indonesia; 096 Brunei; 608 Philippines; 626 Timor-Leste|east timor'],
  ]],
  ['Africa', [
    ['naf', 'North Africa', '504 Morocco; 012 Algeria; 788 Tunisia; 434 Libya; 818 Egypt; 729 Sudan'],
    ['waf', 'West Africa', "478 Mauritania; 686 Senegal; 270 Gambia; 624 Guinea-Bissau; 324 Guinea; 694 Sierra Leone; 430 Liberia; 384 Côte d'Ivoire|ivory coast; 288 Ghana; 768 Togo; 204 Benin; 854 Burkina Faso; 466 Mali; 562 Niger; 566 Nigeria; 132 Cape Verde|cabo verde"],
    ['caf', 'Central Africa', '148 Chad; 140 Central African Republic|car; 120 Cameroon; 226 Equatorial Guinea; 266 Gabon; 178 Republic of the Congo|congo|republic of congo|congo brazzaville; 180 DR Congo|democratic republic of the congo|democratic republic of congo|drc|congo kinshasa; 678 São Tomé and Príncipe|sao tome; 024 Angola'],
    ['eaf', 'East Africa', '232 Eritrea; 231 Ethiopia; 262 Djibouti; 706 Somalia; 728 South Sudan; 404 Kenya; 800 Uganda; 646 Rwanda; 108 Burundi; 834 Tanzania; 690 Seychelles'],
    ['saf', 'Southern Africa', '894 Zambia; 454 Malawi; 508 Mozambique; 716 Zimbabwe; 072 Botswana; 516 Namibia; 710 South Africa; 426 Lesotho; 748 Eswatini|swaziland; 450 Madagascar; 480 Mauritius; 174 Comoros'],
  ]],
  ['Oceania', [
    ['aus', 'Australia & Melanesia', '036 Australia; 554 New Zealand; 598 Papua New Guinea|png; 090 Solomon Islands; 548 Vanuatu; 242 Fiji'],
    ['pac', 'Pacific Islands', '882 Samoa; 776 Tonga; 296 Kiribati; 798 Tuvalu; 520 Nauru; 584 Marshall Islands; 583 Micronesia; 585 Palau'],
  ]],
];

// Territories and dependencies, quizzed only when "Include territories" is on.
// Same format plus "^Sovereign" (shown as a hint, not needed when typing).
const TERR_DEFS = {
  na: '304 Greenland^Denmark; 060 Bermuda^UK; 666 Saint Pierre and Miquelon^France',
  cb: '630 Puerto Rico^USA; 850 U.S. Virgin Islands|us virgin islands|usvi^USA; 092 British Virgin Islands|bvi^UK; 136 Cayman Islands|caymans^UK; 796 Turks and Caicos Islands|turks and caicos^UK; 660 Anguilla^UK; 500 Montserrat^UK; 533 Aruba^Netherlands; 531 Curaçao^Netherlands; 534 Sint Maarten^Netherlands; BQ Caribbean Netherlands|bonaire|bes islands^Netherlands; 663 Saint Martin^France; 652 Saint Barthélemy|saint barts|saint barths^France; GP Guadeloupe^France; MQ Martinique^France',
  sa: 'GF French Guiana^France; 238 Falkland Islands|falklands|malvinas^UK; 239 South Georgia and the South Sandwich Islands|south georgia^UK',
  neu: '234 Faroe Islands|faroes|faeroe islands^Denmark; 248 Åland|aland islands^Finland; SJ Svalbard and Jan Mayen|svalbard^Norway; 833 Isle of Man^UK (Crown Dependency); 831 Guernsey^UK (Crown Dependency); 832 Jersey^UK (Crown Dependency)',
  eas: '344 Hong Kong^China (SAR); 446 Macau|macao^China (SAR)',
  sas: '086 British Indian Ocean Territory|chagos islands|chagos^UK',
  sea: 'CX Christmas and Cocos Islands|christmas island|cocos islands^Australia',
  naf: '732 Western Sahara^Disputed (Morocco)',
  waf: '654 Saint Helena|saint helena ascension and tristan da cunha^UK',
  saf: 'RE Réunion^France; YT Mayotte^France',
  aus: '540 New Caledonia^France; 574 Norfolk Island^Australia',
  pac: '316 Guam^USA; 580 Northern Mariana Islands^USA; 016 American Samoa^USA; 258 French Polynesia|tahiti^France; 876 Wallis and Futuna^France; 184 Cook Islands^New Zealand; 570 Niue^New Zealand; TK Tokelau^New Zealand; 612 Pitcairn Islands|pitcairn^UK',
};

// Capitals for the sovereign countries in REGION_DEFS, keyed by ISO code.
// The first form is the answer shown; every form is accepted when typing.
// Policy: use the declared capital, and accept legitimate seats of government and
// common alternate spellings. Former capitals are not accepted (Abuja, not Lagos).
const CAPITAL_DEFS = {
  // North America
  '124': ["Ottawa"],
  '840': ["Washington, D.C.", "Washington DC", "Washington"],
  '484': ["Mexico City", "Ciudad de Mexico", "Mexico"],

  // Central America
  '084': ["Belmopan"],
  '320': ["Guatemala City", "Guatemala"],
  '340': ["Tegucigalpa"],
  '222': ["San Salvador"],
  '558': ["Managua"],
  '188': ["San José"],
  '591': ["Panama City", "Panama"],

  // Caribbean
  '192': ["Havana"],
  '388': ["Kingston"],
  '332': ["Port-au-Prince"],
  '214': ["Santo Domingo"],
  '044': ["Nassau"],
  '780': ["Port of Spain"],
  '052': ["Bridgetown"],
  '662': ["Castries"],
  '670': ["Kingstown"],
  '308': ["St. George's", "Saint George's"],
  '028': ["Saint John's", "St. John's"],
  '212': ["Roseau"],
  '659': ["Basseterre"],

  // South America
  '032': ["Buenos Aires"],
  '068': ["Sucre", "La Paz"],
  '076': ["Brasília", "Brasilia"],
  '152': ["Santiago"],
  '170': ["Bogotá", "Bogota"],
  '218': ["Quito"],
  '328': ["Georgetown"],
  '600': ["Asunción", "Asuncion"],
  '604': ["Lima"],
  '740': ["Paramaribo"],
  '858': ["Montevideo"],
  '862': ["Caracas"],

  // Northern Europe
  '352': ["Reykjavík", "Reykjavik"],
  '578': ["Oslo"],
  '752': ["Stockholm"],
  '246': ["Helsinki"],
  '208': ["Copenhagen"],
  '233': ["Tallinn"],
  '428': ["Riga"],
  '440': ["Vilnius"],
  '826': ["London"],
  '372': ["Dublin"],

  // Western Europe
  '250': ["Paris"],
  '056': ["Brussels"],
  '528': ["Amsterdam", "The Hague"],
  '442': ["Luxembourg", "Luxembourg City"],
  '276': ["Berlin"],
  '756': ["Bern", "Berne"],
  '040': ["Vienna"],
  '438': ["Vaduz"],
  '492': ["Monaco"],

  // Southern Europe
  '620': ["Lisbon"],
  '724': ["Madrid"],
  '020': ["Andorra la Vella"],
  '380': ["Rome"],
  '674': ["San Marino"],
  '336': ["Vatican City"],
  '470': ["Valletta"],
  '300': ["Athens"],
  '196': ["Nicosia"],

  // Balkans
  '705': ["Ljubljana"],
  '191': ["Zagreb"],
  '070': ["Sarajevo"],
  '688': ["Belgrade"],
  '499': ["Podgorica"],
  'XK': ["Pristina", "Prishtina"],
  '008': ["Tirana"],
  '807': ["Skopje"],
  '100': ["Sofia"],

  // Eastern Europe
  '616': ["Warsaw"],
  '203': ["Prague"],
  '703': ["Bratislava"],
  '348': ["Budapest"],
  '642': ["Bucharest"],
  '498': ["Chișinău", "Chisinau"],
  '804': ["Kyiv", "Kiev"],
  '112': ["Minsk"],
  '643': ["Moscow"],

  // Middle East
  '792': ["Ankara"],
  '760': ["Damascus"],
  '422': ["Beirut"],
  '376': ["Jerusalem"],
  '275': ["Ramallah", "East Jerusalem"],
  '400': ["Amman"],
  '368': ["Baghdad"],
  '364': ["Tehran"],
  '682': ["Riyadh"],
  '414': ["Kuwait City", "Kuwait"],
  '048': ["Manama"],
  '634': ["Doha"],
  '784': ["Abu Dhabi"],
  '512': ["Muscat"],
  '887': ["Sana'a", "Sanaa", "Aden"],

  // Caucasus & Central Asia
  '268': ["Tbilisi"],
  '051': ["Yerevan"],
  '031': ["Baku"],
  '398': ["Astana", "Nur-Sultan"],
  '860': ["Tashkent"],
  '795': ["Ashgabat"],
  '417': ["Bishkek"],
  '762': ["Dushanbe"],

  // South Asia
  '004': ["Kabul"],
  '586': ["Islamabad"],
  '356': ["New Delhi", "Delhi"],
  '524': ["Kathmandu"],
  '064': ["Thimphu"],
  '050': ["Dhaka"],
  '144': ["Sri Jayawardenepura Kotte", "Kotte", "Colombo"],
  '462': ["Malé", "Male"],

  // East Asia
  '156': ["Beijing", "Peking"],
  '496': ["Ulaanbaatar", "Ulan Bator"],
  '408': ["Pyongyang"],
  '410': ["Seoul"],
  '392': ["Tokyo"],
  '158': ["Taipei"],

  // Southeast Asia
  '104': ["Naypyidaw", "Nay Pyi Taw", "Naypyitaw"],
  '764': ["Bangkok"],
  '418': ["Vientiane"],
  '116': ["Phnom Penh"],
  '704': ["Hanoi"],
  '458': ["Kuala Lumpur", "Putrajaya"],
  '702': ["Singapore"],
  '360': ["Jakarta", "Nusantara"],
  '096': ["Bandar Seri Begawan"],
  '608': ["Manila"],
  '626': ["Dili"],

  // North Africa
  '504': ["Rabat"],
  '012': ["Algiers"],
  '788': ["Tunis"],
  '434': ["Tripoli"],
  '818': ["Cairo"],
  '729': ["Khartoum"],

  // West Africa
  '478': ["Nouakchott"],
  '686': ["Dakar"],
  '270': ["Banjul"],
  '624': ["Bissau"],
  '324': ["Conakry"],
  '694': ["Freetown"],
  '430': ["Monrovia"],
  '384': ["Yamoussoukro", "Abidjan"],
  '288': ["Accra"],
  '768': ["Lomé", "Lome"],
  '204': ["Porto-Novo", "Cotonou"],
  '854': ["Ouagadougou"],
  '466': ["Bamako"],
  '562': ["Niamey"],
  '566': ["Abuja"],
  '132': ["Praia"],

  // Central Africa
  '148': ["N'Djamena", "Ndjamena"],
  '140': ["Bangui"],
  '120': ["Yaoundé", "Yaounde"],
  '226': ["Malabo"],
  '266': ["Libreville"],
  '178': ["Brazzaville"],
  '180': ["Kinshasa"],
  '678': ["São Tomé", "Sao Tome"],
  '024': ["Luanda"],

  // East Africa
  '232': ["Asmara"],
  '231': ["Addis Ababa"],
  '262': ["Djibouti", "Djibouti City"],
  '706': ["Mogadishu"],
  '728': ["Juba"],
  '404': ["Nairobi"],
  '800': ["Kampala"],
  '646': ["Kigali"],
  '108': ["Gitega"],
  '834': ["Dodoma", "Dar es Salaam"],
  '690': ["Victoria"],

  // Southern Africa
  '894': ["Lusaka"],
  '454': ["Lilongwe"],
  '508': ["Maputo"],
  '716': ["Harare"],
  '072': ["Gaborone"],
  '516': ["Windhoek"],
  '710': ["Pretoria", "Cape Town", "Bloemfontein"],
  '426': ["Maseru"],
  '748': ["Mbabane", "Lobamba"],
  '450': ["Antananarivo"],
  '480': ["Port Louis"],
  '174': ["Moroni"],

  // Australia & Melanesia
  '036': ["Canberra"],
  '554': ["Wellington"],
  '598': ["Port Moresby"],
  '090': ["Honiara"],
  '548': ["Port Vila"],
  '242': ["Suva"],

  // Pacific Islands
  '882': ["Apia"],
  '776': ["Nuku'alofa", "Nukualofa"],
  '296': ["South Tarawa", "Tarawa"],
  '798': ["Funafuti"],
  '520': ["Yaren"],
  '584': ["Majuro"],
  '583': ["Palikir"],
  '585': ["Ngerulmud"],
};

// Map pieces without an ISO id (or that should be dissolved into a country).
const NAME_TO_CODE = { 'Kosovo': 'XK', 'Somaliland': '706', 'N. Cyprus': '196', 'Indian Ocean Ter.': 'CX' };
// Overseas parts that Natural Earth draws as part of the parent country:
// [parent, new code, test on the polygon's centroid (lon, lat)].
const SPLITS = [
  ['250', 'GF', (x, y) => x > -56 && x < -50 && y > 1 && y < 7],
  ['250', 'GP', (x, y) => x > -62 && x < -60.9 && y > 15.8 && y < 16.6],
  ['250', 'MQ', (x, y) => x > -61.4 && x < -60.7 && y > 14.3 && y < 15],
  ['250', 'RE', (x, y) => x > 55 && x < 56 && y > -21.5 && y < -20.7],
  ['250', 'YT', (x, y) => x > 44.8 && x < 45.5 && y > -13.2 && y < -12.4],
  ['528', 'BQ', (x, y) => x < -60],
  ['578', 'SJ', (x, y) => y > 73.5 || x < 0],
  ['554', 'TK', (x, y) => x < -170 && y > -12],
];
// Nicer names for the shapes that are never quizzed.
const EXTRA_NAMES = { '260': 'French Southern & Antarctic Lands', '334': 'Heard & McDonald Islands', 'x-Siachen Glacier': 'Siachen Glacier (disputed)' };
