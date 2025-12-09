export interface Testimonial {
  id: string
  name: string
  role: string
  years: string
  rating: number
  text: string
  image?: string
}

export interface ApplicationFormData {
  // Contact Information
  firstName: string
  lastName: string
  email: string
  phone: string
  
  // Driver Information
  driverType: "company-driver" | "owner-operator"
  cdlClass: string
  experienceYears: string
  availability: string
  routeType: string
  comments?: string
}

export interface NavLink {
  href: string
  label: string
}

export interface PayRate {
  perMile?: string
  annual: string
  homeTime?: string
  commission?: string
}

export interface JobRequirement {
  text: string
  required: boolean
}

export interface Benefit {
  icon: string
  title: string
  description: string
}

