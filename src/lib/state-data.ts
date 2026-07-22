/**
 * The 48 contiguous states LoadOff/Thind hires in and hauls through — data
 * for the /cdl-jobs/[state] landing pages. Cities are real freight markets,
 * corridors are the interstates a driver would actually run there. Content
 * stays honest: same pay everywhere (it's the same company), what varies per
 * page is geography.
 */
export interface StateInfo {
  slug: string
  name: string
  abbr: string
  cities: string[]
  corridors: string[]
  region: "West" | "Southwest" | "Midwest" | "South" | "Northeast"
}

export const STATES: readonly StateInfo[] = [
  { slug: "washington", name: "Washington", abbr: "WA", cities: ["Seattle", "Kent", "Spokane", "Tacoma"], corridors: ["I-5", "I-90", "I-82"], region: "West" },
  { slug: "oregon", name: "Oregon", abbr: "OR", cities: ["Portland", "Salem", "Eugene"], corridors: ["I-5", "I-84"], region: "West" },
  { slug: "california", name: "California", abbr: "CA", cities: ["Sacramento", "Los Angeles", "Fresno", "Oakland"], corridors: ["I-5", "I-80", "I-10"], region: "West" },
  { slug: "idaho", name: "Idaho", abbr: "ID", cities: ["Boise", "Twin Falls", "Pocatello"], corridors: ["I-84", "I-15", "I-90"], region: "West" },
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
