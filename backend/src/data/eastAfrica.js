/**
 * The directory's launch region: every East African country with the cities it
 * serves. Coordinates are real city centres — listings offset from them, so a
 * pinned business always lands somewhere a map and turn-by-turn directions can
 * reach. `HUB_AREAS` covers the cities the demo listings actually sit in.
 */

const COUNTRIES = [
  {
    country: "Tanzania",
    cities: [
      ["Dar es Salaam", -6.8, 39.2833],
      ["Dodoma", -6.1659, 35.739],
      ["Arusha", -3.3667, 36.6833],
      ["Mwanza", -2.5167, 32.9],
      ["Zanzibar", -6.162, 39.192],
      ["Mbeya", -8.89, 33.49],
      ["Morogoro", -6.8243, 37.6544],
      ["Tanga", -5.068, 39.1034],
    ],
  },
  {
    country: "Kenya",
    cities: [
      ["Nairobi", -1.2864, 36.8172],
      ["Mombasa", -4.0435, 39.6682],
      ["Kisumu", -0.0917, 34.768],
      ["Nakuru", -0.3031, 36.08],
      ["Eldoret", 0.5143, 35.2698],
      ["Thika", -1.0333, 37.0693],
      ["Malindi", -3.2192, 40.1169],
    ],
  },
  {
    country: "Uganda",
    cities: [
      ["Kampala", 0.3476, 32.5825],
      ["Entebbe", 0.0512, 32.4631],
      ["Jinja", 0.4244, 33.2042],
      ["Gulu", 2.7726, 32.2985],
      ["Mbarara", -0.6084, 30.6545],
      ["Mbale", 1.085, 34.175],
    ],
  },
  {
    country: "Rwanda",
    cities: [
      ["Kigali", -1.9441, 30.0619],
      ["Huye", -2.6086, 29.7397],
      ["Rubavu", -1.7028, 29.256],
      ["Musanze", -1.4996, 29.6337],
    ],
  },
  {
    country: "Burundi",
    cities: [
      ["Bujumbura", -3.3822, 29.3648],
      ["Gitega", -3.4266, 29.9246],
      ["Rumonge", -3.9667, 29.4333],
    ],
  },
  {
    country: "South Sudan",
    cities: [
      ["Juba", 4.8517, 31.5825],
      ["Wau", 7.699, 27.99],
      ["Malakal", 9.5333, 31.65],
    ],
  },
  {
    country: "Democratic Republic of the Congo",
    cities: [
      ["Goma", -1.6771, 29.2224],
      ["Bukavu", -2.3167, 28.85],
      ["Kisangani", 0.5167, 25.2],
    ],
  },
  {
    country: "Ethiopia",
    cities: [
      ["Addis Ababa", 9.032, 38.7469],
      ["Adama", 8.5833, 39.2667],
      ["Dire Dawa", 9.6, 41.8667],
      ["Bahir Dar", 11.5861, 37.3896],
      ["Hawassa", 7.0621, 38.4764],
      ["Mekelle", 13.4919, 39.5186],
    ],
  },
  {
    country: "Somalia",
    cities: [
      ["Mogadishu", 2.0438, 45.3182],
      ["Hargeisa", 9.5624, 44.077],
      ["Kismayo", -0.3575, 42.5454],
      ["Bosaso", 11.2842, 49.1817],
    ],
  },
  {
    country: "Eritrea",
    cities: [
      ["Asmara", 15.3333, 38.9333],
      ["Keren", 15.7775, 38.4511],
      ["Massawa", 15.6098, 39.4611],
    ],
  },
  {
    country: "Djibouti",
    cities: [
      ["Djibouti City", 11.5881, 43.1456],
      ["Tadjoura", 11.789, 42.89],
    ],
  },
  {
    country: "Mozambique",
    cities: [
      ["Maputo", -25.9692, 32.5732],
      ["Beira", -19.8436, 34.8389],
      ["Nampula", -15.1165, 39.2666],
    ],
  },
  {
    country: "Malawi",
    cities: [
      ["Lilongwe", -13.9777, 33.7927],
      ["Blantyre", -15.7867, 35.0085],
      ["Mzuzu", -11.4614, 34.0208],
    ],
  },
  {
    country: "Zambia",
    cities: [
      ["Lusaka", -15.4067, 28.2871],
      ["Ndola", -12.9756, 28.6348],
      ["Kitwe", -12.8097, 28.2197],
    ],
  },
  {
    country: "Zimbabwe",
    cities: [
      ["Harare", -17.8317, 31.0457],
      ["Bulawayo", -20.1525, 28.587],
    ],
  },
  {
    country: "Madagascar",
    cities: [
      ["Antananarivo", -18.8792, 47.5079],
      ["Toamasina", -18.15, 49.3833],
    ],
  },
  { country: "Comoros", cities: [["Moroni", -11.6986, 43.2551]] },
  { country: "Mauritius", cities: [["Port Louis", -20.1609, 57.5012]] },
  { country: "Seychelles", cities: [["Victoria", -4.6191, 55.4513]] },
];

const CITIES = COUNTRIES.flatMap(({ country, cities }) =>
  cities.map(([city, latitude, longitude]) => ({ country, city, latitude, longitude }))
);

const BY_NAME = new Map(CITIES.map((c) => [c.city, c]));

// Neighbourhoods the demo listings are addressed in. Only the cities that
// actually host a listing need one.
const HUB_AREAS = {
  "Dar es Salaam": ["Mikocheni", "Sinza", "Ubungo", "Masaki", "Kariakoo", "Mwananyamala"],
  Dodoma: ["Chamino", "State Hill", "Ring Road"],
  Arusha: ["Sakina", "Leletu", "Elerai", "Oltureni"],
  Zanzibar: ["Huruma Road", "Shangani Street"],
  Nairobi: ["Westlands", "Kilimani", "Karen", "Roysambu", "Parklands", "South B"],
  Mombasa: ["Nyali", "Tudor", "Bamburi", "Likoni"],
  Kisumu: ["Milimani", "Nyalenda"],
  Kampala: ["Nakawa", "Ntinda", "Kololo", "Bugolobi", "Najjera"],
  Kigali: ["Nyarutarama", "Kimihurura", "Kacyiru", "Gikondo", "Nyamirambo"],
  Bujumbura: ["Rohero", "Gatumba", "Kibenga"],
  "Addis Ababa": ["Bole", "Piassa", "CMC", "Sarbet", "Ayat"],
  Juba: ["Konyo Konyo", "Gudele", "Gumbo"],
};

// The four invented cities the demo dataset used before it went regional.
const LEGACY_CITIES = ["Springfield", "Lakeview", "Riverdale", "Westside", "Remote"];

module.exports = { COUNTRIES, CITIES, BY_NAME, HUB_AREAS, LEGACY_CITIES };
