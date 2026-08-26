/**
 * The 48 contiguous states LoadOff/Thind hires in and hauls through — data
 * for the /cdl-jobs/[state] landing pages. Cities are real freight markets,
 * corridors are the interstates a driver would actually run there. Content
 * stays honest: same pay everywhere (it's the same company), what varies per
 * page is geography.
 */
/**
 * Optional per-state deep content for the /cdl-jobs/[state] pages.
 * Every fact here must be web-verifiable at the time it is written — the
 * deepening pass (docs/claude-routines.md, Reach & SEO routine) adds one
 * state per firing. Never spin filler: a page a real driver wouldn't find
 * useful is worse than the plain template.
 */
export interface StateDeepDive {
  /** Freight-market notes for the state's major markets (ports, distribution corridors, reload points). */
  markets: { name: string; note: string }[]
  /** Seasonal lane notes a driver planning their calendar would care about. */
  seasonal: string[]
  /** Driver-relevant facts specific to this state (taxes, chain laws, enforcement quirks). */
  driverFacts: string[]
}

export interface StateInfo {
  slug: string
  name: string
  abbr: string
  cities: string[]
  corridors: string[]
  region: "West" | "Southwest" | "Midwest" | "South" | "Northeast"
  deepDive?: StateDeepDive
}

export const STATES: readonly StateInfo[] = [
  {
    slug: "washington", name: "Washington", abbr: "WA",
    cities: ["Seattle", "Kent", "Spokane", "Tacoma"], corridors: ["I-5", "I-90", "I-82"], region: "West",
    deepDive: {
      markets: [
        {
          name: "Seattle & Tacoma",
          note: "The two ports operate together as the Northwest Seaport Alliance — the sixth-busiest container gateway in the country, moving over 3 million TEUs a year. That port volume feeds steady drayage-adjacent dry van work in both directions, and import surges show up as reload opportunities across the whole Puget Sound market.",
        },
        {
          name: "Kent Valley",
          note: "Our home yard sits in the Kent–Auburn–Sumner industrial corridor — the second-largest industrial park on the West Coast and the third-largest distribution and warehouse concentration in the nation, behind only NY/NJ and Los Angeles. Big-box distribution freight starts minutes from where our trucks park.",
        },
        {
          name: "Spokane",
          note: "The I-90 gateway between Puget Sound and the northern Rockies — the last major market heading east and a regular reload point on our I-90 runs into Idaho and Montana.",
        },
        {
          name: "Yakima & Wenatchee",
          note: "Central Washington's produce belt, reached off I-82 and US-2/I-90. During harvest this is one of the strongest reefer origin markets in the western US — see the seasonal notes below.",
        },
      ],
      seasonal: [
        "Apple season is the big one: Washington grows roughly 60% of America's fresh apples, and harvest runs August (Gala) through November (Fuji, Granny Smith), with mid-October the peak crush. Reefer demand and outbound rates out of Yakima, Wenatchee, and the Columbia Basin climb through the fall — a well-timed reefer can stay loaded out of central Washington for months.",
        "Winter on the passes: from November 1 to April 1, every rig over 10,000 lbs GVWR must carry chains on designated routes, including I-90 over Snoqualmie Pass (the chain-law area runs roughly North Bend to Ellensburg). Snoqualmie is the state's most actively enforced chain zone, and getting caught without chains when they're required is a $500 fine — we plan winter transit windows over the pass rather than gamble on them.",
      ],
      driverFacts: [
        "Washington has no state income tax — a company driver's wages and an owner operator's earnings only see federal tax here, so the same gross pay nets you more than it would in most other states.",
      ],
    },
  },
  {
    slug: "oregon", name: "Oregon", abbr: "OR",
    cities: ["Portland", "Salem", "Eugene"], corridors: ["I-5", "I-84"], region: "West",
    deepDive: {
      markets: [
        {
          name: "Portland",
          note: "Where I-5 meets I-84 at the Columbia River — the freight crossroads of the Northwest. Port of Portland auto and breakbulk traffic plus the metro's distribution cluster (Swan Island, Rivergate, Troutdale) make it our most common Oregon pickup and delivery market, an easy three-hour run down I-5 from the Kent yard.",
        },
        {
          name: "Willamette Valley (Salem–Eugene)",
          note: "Food processing, nursery stock, and wood products the whole length of I-5 between Portland and Eugene. The valley is also the country's biggest grass-seed producer — summer brings steady outbound ag freight on top of the year-round processed-food lanes.",
        },
        {
          name: "Columbia Gorge & Eastern Oregon (I-84)",
          note: "Our main eastbound lane out of Portland. Boardman and Hermiston have grown into a real reload market — food processors, cold storage, and the Umatilla-area distribution build-out — before the long climb over Cabbage Hill (Emigrant Hill) into La Grande and on toward Ontario, the onion-and-potato gateway to Idaho's Treasure Valley.",
        },
        {
          name: "Southern Oregon (Medford–Ashland)",
          note: "The I-5 pinch point: Siskiyou Summit at the California line is the highest point on the entire interstate (4,310 ft), and winter closures or chain restrictions there back freight up through the whole corridor. Medford itself reloads produce and wood products.",
        },
      ],
      seasonal: [
        "Christmas trees are an Oregon specialty — the state is the nation's number-one producer, and from mid-November into December the Willamette Valley loads out trees by the truckload. A reefer or curtain-side positioned there in late November rarely sits.",
        "Winter chains: Oregon's chain law is condition-triggered — when ODOT posts the requirement (TripCheck signs), trucks over 26,000 lbs must chain up, and the two places we actually plan around are Siskiyou Summit on I-5 and Cabbage Hill on I-84. Both can flip from bare road to chains-required in an afternoon; we watch TripCheck and time the pass rather than sit in a chain-up line.",
      ],
      driverFacts: [
        "Oregon is not like other states on fuel tax: heavy trucks pay a weight-mile tax instead of the pump tax, reported per mile run in the state. The office handles the filings — what a driver notices is the Green Light weigh-station preclearance transponders and the state's unusually thorough mileage records.",
        "Watch your speed split: Oregon posts different limits for trucks and cars on much of its interstate network, with trucks slower. Plan trip times off the truck limit, not the car signs.",
      ],
    },
  },
  { slug: "california", name: "California", abbr: "CA", cities: ["Sacramento", "Los Angeles", "Fresno", "Oakland"], corridors: ["I-5", "I-80", "I-10"], region: "West" },
  {
    slug: "idaho", name: "Idaho", abbr: "ID",
    cities: ["Boise", "Twin Falls", "Pocatello"], corridors: ["I-84", "I-15", "I-90"], region: "West",
    deepDive: {
      markets: [
        {
          name: "Treasure Valley (Boise–Nampa–Caldwell)",
          note: "Idaho's population and distribution center, strung along I-84. Grocery and big-box DCs serve the whole state from here, and the food processors on the valley's west end (onions, dairy, frozen goods around Caldwell and Fruitland) generate the reefer freight we actually haul on this lane.",
        },
        {
          name: "Magic Valley (Twin Falls–Jerome)",
          note: "One of the densest dairy-processing clusters in the country — yogurt, cheese, and milk-powder plants drawing on southern Idaho's enormous dairy herds. Steady reefer in and out year-round, and barley/sugar-beet ag freight around it.",
        },
        {
          name: "Eastern Idaho (Pocatello–Idaho Falls)",
          note: "Potato country on I-15. The fresh pack sheds and the processing plants (fries, flakes, dehy) ship nationwide from a fairly small area, which makes it a dependable reefer origin from fall harvest deep into the storage season.",
        },
        {
          name: "The Panhandle (I-90)",
          note: "Our Spokane→Montana through-lane. Coeur d'Alene is the reload stop; Fourth of July Pass and Lookout Pass at the Montana line are the two winter chokepoints — see the chain notes below.",
        },
      ],
      seasonal: [
        "Potato harvest runs September into October, and the freight doesn't stop when digging does — Idaho spuds ship out of storage all winter, so eastern Idaho stays a live reefer market from fall through spring. Sugar-beet campaign trucks crowd the Magic Valley's rural roads in October.",
        "Winter on I-90: Fourth of July Pass and Lookout Pass both carry chain-up areas, and Idaho requires trucks to chain when conditions trigger the posted requirement. Lookout, at the Montana line, is the one that closes hardest — we treat November-to-March crossings as weather-window planning, same as Snoqualmie.",
      ],
      driverFacts: [
        "Idaho's rural interstates post 80 mph for cars but hold trucks to 70 — like Oregon, plan your trip math on the truck limit.",
        "No ports of entry surprises: Idaho runs conventional weigh stations on I-84 and I-90, and a truck running heavy out of the ag valleys during harvest season should expect them open.",
      ],
    },
  },
  { slug: "nevada", name: "Nevada", abbr: "NV", cities: ["Reno", "Las Vegas", "Elko"], corridors: ["I-80", "I-15"], region: "West" },
  { slug: "montana", name: "Montana", abbr: "MT", cities: ["Billings", "Missoula", "Great Falls"], corridors: ["I-90", "I-15", "I-94"], region: "West" },
  { slug: "wyoming", name: "Wyoming", abbr: "WY", cities: ["Cheyenne", "Casper", "Rock Springs"], corridors: ["I-80", "I-25", "I-90"], region: "West" },
  { slug: "utah", name: "Utah", abbr: "UT", cities: ["Salt Lake City", "Ogden", "Provo"], corridors: ["I-15", "I-80", "I-70"], region: "West" },
  { slug: "colorado", name: "Colorado", abbr: "CO", cities: ["Denver", "Colorado Springs", "Grand Junction"], corridors: ["I-70", "I-25", "I-76"], region: "West" },
  { slug: "arizona", name: "Arizona", abbr: "AZ", cities: ["Phoenix", "Tucson", "Flagstaff"], corridors: ["I-10", "I-40", "I-17"], region: "Southwest" },
  { slug: "new-mexico", name: "New Mexico", abbr: "NM", cities: ["Albuquerque", "Las Cruces", "Santa Fe"], corridors: ["I-40", "I-25", "I-10"], region: "Southwest" },
  { slug: "texas", name: "Texas", abbr: "TX", cities: ["Dallas", "Houston", "El Paso", "Laredo"], corridors: ["I-35", "I-10", "I-20", "I-45"], region: "Southwest" },
  { slug: "oklahoma", name: "Oklahoma", abbr: "OK", cities: ["Oklahoma City", "Tulsa"], corridors: ["I-40", "I-35", "I-44"], region: "Southwest" },
  { slug: "north-dakota", name: "North Dakota", abbr: "ND", cities: ["Fargo", "Bismarck"], corridors: ["I-94", "I-29"], region: "Midwest" },
  { slug: "south-dakota", name: "South Dakota", abbr: "SD", cities: ["Sioux Falls", "Rapid City"], corridors: ["I-90", "I-29"], region: "Midwest" },
  { slug: "nebraska", name: "Nebraska", abbr: "NE", cities: ["Omaha", "Lincoln", "North Platte"], corridors: ["I-80", "I-76"], region: "Midwest" },
  { slug: "kansas", name: "Kansas", abbr: "KS", cities: ["Kansas City", "Wichita", "Salina"], corridors: ["I-70", "I-35", "I-135"], region: "Midwest" },
  { slug: "minnesota", name: "Minnesota", abbr: "MN", cities: ["Minneapolis", "St. Paul", "Duluth"], corridors: ["I-94", "I-35"], region: "Midwest" },
  { slug: "iowa", name: "Iowa", abbr: "IA", cities: ["Des Moines", "Cedar Rapids", "Council Bluffs"], corridors: ["I-80", "I-35", "I-380"], region: "Midwest" },
  { slug: "missouri", name: "Missouri", abbr: "MO", cities: ["Kansas City", "St. Louis", "Springfield"], corridors: ["I-70", "I-44", "I-55"], region: "Midwest" },
  { slug: "wisconsin", name: "Wisconsin", abbr: "WI", cities: ["Milwaukee", "Madison", "Green Bay"], corridors: ["I-94", "I-90", "I-43"], region: "Midwest" },
  { slug: "illinois", name: "Illinois", abbr: "IL", cities: ["Chicago", "Joliet", "Springfield"], corridors: ["I-80", "I-55", "I-90", "I-57"], region: "Midwest" },
  { slug: "indiana", name: "Indiana", abbr: "IN", cities: ["Indianapolis", "Fort Wayne", "Gary"], corridors: ["I-65", "I-70", "I-80/90"], region: "Midwest" },
  { slug: "michigan", name: "Michigan", abbr: "MI", cities: ["Detroit", "Grand Rapids", "Lansing"], corridors: ["I-94", "I-75", "I-96"], region: "Midwest" },
  { slug: "ohio", name: "Ohio", abbr: "OH", cities: ["Columbus", "Cincinnati", "Cleveland", "Toledo"], corridors: ["I-70", "I-71", "I-75", "I-80"], region: "Midwest" },
  { slug: "arkansas", name: "Arkansas", abbr: "AR", cities: ["Little Rock", "Fort Smith"], corridors: ["I-40", "I-30"], region: "South" },
  { slug: "louisiana", name: "Louisiana", abbr: "LA", cities: ["New Orleans", "Baton Rouge", "Shreveport"], corridors: ["I-10", "I-20", "I-49"], region: "South" },
  { slug: "mississippi", name: "Mississippi", abbr: "MS", cities: ["Jackson", "Gulfport"], corridors: ["I-55", "I-20", "I-10"], region: "South" },
  { slug: "alabama", name: "Alabama", abbr: "AL", cities: ["Birmingham", "Montgomery", "Mobile"], corridors: ["I-65", "I-20", "I-10"], region: "South" },
  { slug: "tennessee", name: "Tennessee", abbr: "TN", cities: ["Memphis", "Nashville", "Knoxville"], corridors: ["I-40", "I-65", "I-75", "I-24"], region: "South" },
  { slug: "kentucky", name: "Kentucky", abbr: "KY", cities: ["Louisville", "Lexington", "Bowling Green"], corridors: ["I-65", "I-75", "I-64"], region: "South" },
  { slug: "west-virginia", name: "West Virginia", abbr: "WV", cities: ["Charleston", "Huntington"], corridors: ["I-64", "I-77", "I-79"], region: "South" },
  { slug: "virginia", name: "Virginia", abbr: "VA", cities: ["Richmond", "Norfolk", "Roanoke"], corridors: ["I-95", "I-81", "I-64"], region: "South" },
  { slug: "north-carolina", name: "North Carolina", abbr: "NC", cities: ["Charlotte", "Raleigh", "Greensboro"], corridors: ["I-95", "I-85", "I-40", "I-77"], region: "South" },
  { slug: "south-carolina", name: "South Carolina", abbr: "SC", cities: ["Columbia", "Charleston", "Greenville"], corridors: ["I-95", "I-26", "I-85"], region: "South" },
  { slug: "georgia", name: "Georgia", abbr: "GA", cities: ["Atlanta", "Savannah", "Macon"], corridors: ["I-75", "I-85", "I-95", "I-20"], region: "South" },
  { slug: "florida", name: "Florida", abbr: "FL", cities: ["Jacksonville", "Orlando", "Tampa", "Miami"], corridors: ["I-95", "I-75", "I-10", "I-4"], region: "South" },
  { slug: "pennsylvania", name: "Pennsylvania", abbr: "PA", cities: ["Philadelphia", "Pittsburgh", "Harrisburg"], corridors: ["I-80", "I-76", "I-95", "I-81"], region: "Northeast" },
  { slug: "new-york", name: "New York", abbr: "NY", cities: ["Albany", "Buffalo", "Syracuse"], corridors: ["I-90", "I-87", "I-81"], region: "Northeast" },
  { slug: "new-jersey", name: "New Jersey", abbr: "NJ", cities: ["Newark", "Trenton", "Camden"], corridors: ["I-95", "I-78", "I-80"], region: "Northeast" },
  { slug: "connecticut", name: "Connecticut", abbr: "CT", cities: ["Hartford", "New Haven"], corridors: ["I-95", "I-84", "I-91"], region: "Northeast" },
  { slug: "rhode-island", name: "Rhode Island", abbr: "RI", cities: ["Providence"], corridors: ["I-95"], region: "Northeast" },
  { slug: "massachusetts", name: "Massachusetts", abbr: "MA", cities: ["Boston", "Worcester", "Springfield"], corridors: ["I-90", "I-95", "I-495"], region: "Northeast" },
  { slug: "vermont", name: "Vermont", abbr: "VT", cities: ["Burlington"], corridors: ["I-89", "I-91"], region: "Northeast" },
  { slug: "new-hampshire", name: "New Hampshire", abbr: "NH", cities: ["Manchester", "Concord"], corridors: ["I-93", "I-89"], region: "Northeast" },
  { slug: "maine", name: "Maine", abbr: "ME", cities: ["Portland", "Bangor"], corridors: ["I-95"], region: "Northeast" },
  { slug: "maryland", name: "Maryland", abbr: "MD", cities: ["Baltimore", "Hagerstown"], corridors: ["I-95", "I-70", "I-81"], region: "Northeast" },
  { slug: "delaware", name: "Delaware", abbr: "DE", cities: ["Wilmington", "Dover"], corridors: ["I-95"], region: "Northeast" },
] as const

export function stateBySlug(slug: string): StateInfo | undefined {
  return STATES.find((s) => s.slug === slug)
}

export function neighborStates(state: StateInfo, count = 4): StateInfo[] {
  const sameRegion = STATES.filter((s) => s.region === state.region && s.slug !== state.slug)
  return sameRegion.slice(0, count)
}
