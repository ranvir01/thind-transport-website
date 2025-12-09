"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  TruckIcon, MapPin, DollarSign, Calendar, Clock,
  Filter, Search, ChevronRight, Package, Fuel,
  AlertCircle, TrendingUp, Star, Activity, BarChart3
} from "lucide-react"
import { COMPANY_INFO } from "@/lib/constants"
import { LoadBoardVisualizations } from "@/components/features/LoadBoardVisualizations"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"

interface Load {
  id: string
  origin: string
  originState: string
  destination: string
  destinationState: string
  rate: number
  miles: number
  ratePerMile: number
  weight: string
  commodity: string
  equipmentType: string
  pickupDate: string
  deliveryDate: string
  urgent: boolean
  featured: boolean
}

export default function LoadBoardPage() {
  const [loads, setLoads] = useState<Load[]>([])
  const [filteredLoads, setFilteredLoads] = useState<Load[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [equipmentFilter, setEquipmentFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)

  // Simulated load data
  useEffect(() => {
    const sampleLoads: Load[] = [
      {
        id: "LD001",
        origin: "Seattle, WA",
        originState: "WA",
        destination: "Los Angeles, CA",
        destinationState: "CA",
        rate: 3200,
        miles: 1137,
        ratePerMile: 2.81,
        weight: "42,000 lbs",
        commodity: "Construction Materials",
        equipmentType: "Flatbed",
        pickupDate: "Nov 13",
        deliveryDate: "Nov 15",
        urgent: true,
        featured: true
      },
      {
        id: "LD002",
        origin: "Portland, OR",
        originState: "OR",
        destination: "Phoenix, AZ",
        destinationState: "AZ",
        rate: 2800,
        miles: 1423,
        ratePerMile: 1.97,
        weight: "38,000 lbs",
        commodity: "Packaged Goods",
        equipmentType: "Dry Van",
        pickupDate: "Nov 14",
        deliveryDate: "Nov 17",
        urgent: false,
        featured: false
      },
      {
        id: "LD003",
        origin: "Kent, WA",
        originState: "WA",
        destination: "Denver, CO",
        destinationState: "CO",
        rate: 2650,
        miles: 1323,
        ratePerMile: 2.00,
        weight: "35,000 lbs",
        commodity: "Frozen Foods",
        equipmentType: "Reefer",
        pickupDate: "Nov 13",
        deliveryDate: "Nov 16",
        urgent: true,
        featured: false
      },
      {
        id: "LD004",
        origin: "Tacoma, WA",
        originState: "WA",
        destination: "Salt Lake City, UT",
        destinationState: "UT",
        rate: 1850,
        miles: 856,
        ratePerMile: 2.16,
        weight: "40,000 lbs",
        commodity: "Steel Beams",
        equipmentType: "Flatbed",
        pickupDate: "Nov 15",
        deliveryDate: "Nov 16",
        urgent: false,
        featured: true
      },
      {
        id: "LD005",
        origin: "Spokane, WA",
        originState: "WA",
        destination: "Minneapolis, MN",
        destinationState: "MN",
        rate: 3400,
        miles: 1655,
        ratePerMile: 2.05,
        weight: "39,000 lbs",
        commodity: "Agricultural Equipment",
        equipmentType: "Flatbed",
        pickupDate: "Nov 14",
        deliveryDate: "Nov 18",
        urgent: false,
        featured: false
      }
    ]
    
    setTimeout(() => {
      setLoads(sampleLoads)
      setFilteredLoads(sampleLoads)
      setIsLoading(false)
    }, 1000)
  }, [])

  // Filter loads based on search and equipment type
  useEffect(() => {
    let filtered = loads

    if (searchTerm) {
      filtered = filtered.filter(load => 
        load.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        load.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
        load.commodity.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (equipmentFilter !== "all") {
      filtered = filtered.filter(load => load.equipmentType === equipmentFilter)
    }

    setFilteredLoads(filtered)
  }, [searchTerm, equipmentFilter, loads])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <PageBreadcrumb pageName="Load Board" category="Drivers" />
      
      {/* Enhanced Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 text-white py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-500/10 via-transparent to-transparent" />
        
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-green-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
        
        <div className="container relative">
          <div className="text-center">
            <Badge className="mb-6 bg-white/20 backdrop-blur-md text-white border-white/30 px-4 py-2 text-sm font-bold">
              <Activity className="h-4 w-4 mr-1.5 text-green-300" />
              Live Load Board
            </Badge>
            <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
              Real-Time <span className="text-green-400">Available Loads</span>
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Premium freight opportunities updated every 30 seconds. Find your next profitable haul with competitive rates.
            </p>
          
            {/* Quick Stats */}
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <Card className="p-5 text-center bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20 transition-all duration-300 group">
                <TruckIcon className="h-8 w-8 text-green-300 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <div className="font-black text-4xl text-white">{filteredLoads.length}</div>
                <div className="text-sm text-white/95 mt-1 font-semibold">Active Loads</div>
              </Card>
              <Card className="p-5 text-center bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20 transition-all duration-300 group">
                <TrendingUp className="h-8 w-8 text-emerald-300 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <div className="font-black text-4xl text-white">
                  ${loads.length > 0 ? (loads.reduce((sum, l) => sum + (l.rate / l.miles), 0) / loads.length).toFixed(2) : "2.15"}
                </div>
                <div className="text-sm text-white/95 mt-1 font-semibold">Avg Rate/Mile</div>
              </Card>
              <Card className="p-5 text-center bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20 transition-all duration-300 group">
                <DollarSign className="h-8 w-8 text-yellow-300 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <div className="font-black text-4xl text-white">
                  ${loads.length > 0 ? (loads.reduce((sum, l) => sum + l.rate, 0) / 1000).toFixed(0) : "14"}K
                </div>
                <div className="text-sm text-white/95 mt-1 font-semibold">Total Value</div>
              </Card>
              <Card className="p-5 text-center bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20 transition-all duration-300 group">
                <Clock className="h-8 w-8 text-orange-300 mx-auto mb-3 group-hover:scale-110 transition-transform animate-pulse" />
                <div className="font-black text-2xl text-white">LIVE</div>
                <div className="text-sm text-white/95 mt-1 font-semibold">Real-time Updates</div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-12 -mt-8">
        {/* Load Board Visualizations */}
        {!isLoading && loads.length > 0 && (
          <div className="mb-12">
            <LoadBoardVisualizations loads={loads} />
          </div>
        )}

        {/* Filters */}
        <Card className="p-8 mb-10 shadow-xl border-gray-100 hover:shadow-2xl transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 flex items-center justify-center">
              <Filter className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Filter & Search Loads</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="search">Search loads</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by city, state, or commodity..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="equipment">Equipment Type</Label>
              <select
                id="equipment"
                className="w-full mt-1 px-3 py-2 border rounded-lg"
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value)}
              >
                <option value="all">All Equipment</option>
                <option value="Flatbed">Flatbed</option>
                <option value="Reefer">Reefer</option>
                <option value="Dry Van">Dry Van</option>
              </select>
            </div>
          </div>
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
            <div className="flex items-center gap-2 text-sm font-medium text-green-800">
              <Clock className="h-4 w-4 text-green-600 animate-pulse" />
              <span>Loads update every 30 seconds • Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </Card>

        {/* Load Listings */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredLoads.length === 0 ? (
          <Card className="p-12 text-center">
            <TruckIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No loads found</h3>
            <p className="text-gray-700 mb-4 font-medium">Try adjusting your search criteria</p>
            <Button variant="outline" onClick={() => { setSearchTerm(""); setEquipmentFilter("all") }}>
              Clear Filters
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredLoads.map((load) => (
              <Card 
                key={load.id} 
                className={`p-8 hover:shadow-2xl transition-all duration-300 ${load.featured ? 'border-2 border-blue-400 shadow-xl bg-gradient-to-r from-blue-50/50 to-white' : 'border-gray-100'} hover:-translate-y-1`}
              >
                <div className="grid lg:grid-cols-4 gap-6">
                  {/* Route Info */}
                  <div className="lg:col-span-2">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{load.id}</h3>
                          {load.urgent && (
                            <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 animate-pulse">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Urgent
                            </Badge>
                          )}
                          {load.featured && (
                            <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1">
                              <Star className="h-3 w-3 mr-1 fill-white" />
                              Featured
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{load.origin}</span>
                            <span className="text-gray-500">→</span>
                            <span className="font-medium">{load.destination}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-700 font-medium">
                            <span>{load.miles} miles</span>
                            <span>•</span>
                            <span>{load.weight}</span>
                            <span>•</span>
                            <span>{load.commodity}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Load Details */}
                  <div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 font-medium">Equipment:</span>
                        <Badge variant="secondary">{load.equipmentType}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Pickup:</span>
                        <span className="font-medium">{load.pickupDate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Delivery:</span>
                        <span className="font-medium">{load.deliveryDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rate & Action */}
                  <div className="flex flex-col justify-between">
                    <div className="text-center mb-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                      <div className="text-4xl font-black text-green-700">
                        ${load.rate.toLocaleString()}
                      </div>
                      <div className="text-sm font-semibold text-green-600 mt-1">
                        ${load.ratePerMile}/mile
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Button className="w-full" asChild>
                        <Link href="/apply">
                          Accept Load
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                      <Button variant="outline" className="w-full" asChild>
                        <Link href={`tel:${COMPANY_INFO.phoneFormatted}`}>
                          Call Dispatch
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Load Board Tips */}
        <Card className="mt-16 p-10 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-50 shadow-xl border-gray-100">
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-purple-100 text-purple-700 px-4 py-2 text-xs font-bold">
              Pro Tips
            </Badge>
            <h2 className="text-3xl font-black text-gray-900">
              Maximize Your Load Board Success
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group hover:-translate-y-1">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-4 rounded-xl w-fit mb-4 group-hover:from-blue-500/20 group-hover:to-blue-600/20 transition-colors">
                <DollarSign className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Maximize Earnings</h3>
              <ul className="text-sm text-gray-700 space-y-1 font-medium">
                <li>• Look for loads with $2.00+/mile</li>
                <li>• Consider backhaul opportunities</li>
                <li>• Factor in fuel costs and distance</li>
                <li>• Check for urgent loads (premium rates)</li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group hover:-translate-y-1">
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 p-4 rounded-xl w-fit mb-4 group-hover:from-green-500/20 group-hover:to-emerald-600/20 transition-colors">
                <Clock className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Timing Matters</h3>
              <ul className="text-sm text-gray-700 space-y-1 font-medium">
                <li>• Loads update every 30 seconds</li>
                <li>• Act quickly on high-value loads</li>
                <li>• Check multiple times per day</li>
                <li>• Best rates often go fast</li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group hover:-translate-y-1">
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 p-4 rounded-xl w-fit mb-4 group-hover:from-purple-500/20 group-hover:to-purple-600/20 transition-colors">
                <MapPin className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Route Planning</h3>
              <ul className="text-sm text-gray-700 space-y-1 font-medium">
                <li>• Plan return trips in advance</li>
                <li>• Consider seasonal freight patterns</li>
                <li>• Use filters to find ideal routes</li>
                <li>• Build relationships with regular lanes</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* CTA Section */}
        <Card className="mt-16 p-10 bg-gradient-to-br from-blue-600 via-green-600 to-blue-700 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent" />
          <div className="text-center relative">
            <h2 className="text-4xl font-black text-white mb-4">
              Ready to Start Hauling?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
              Join our fleet and get instant access to premium loads, competitive rates, and 24/7 dispatch support.
              <span className="font-bold text-yellow-300">Owner operators earn 91% commission!</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/apply?type=owner">
                  Apply as Owner Operator
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/apply?type=company">
                  Apply as Company Driver
                </Link>
              </Button>
            </div>
            <p className="mt-6 text-base text-white/95">
              Questions? Call us 24/7 at{" "}
              <a href={`tel:${COMPANY_INFO.phoneFormatted}`} className="font-bold text-yellow-300 hover:text-yellow-200 transition-colors">
                {COMPANY_INFO.phone}
              </a>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
