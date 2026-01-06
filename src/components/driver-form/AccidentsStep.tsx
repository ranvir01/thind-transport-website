"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, Plus, Trash2 } from "lucide-react"
import type { AccidentHistory, AccidentEntry, TrafficHistory, TrafficEntry } from "@/types/driver-application-form"

interface AccidentsStepProps {
  accidentData: AccidentHistory
  trafficData: TrafficHistory
  onAccidentChange: (data: AccidentHistory) => void
  onTrafficChange: (data: TrafficHistory) => void
  errors?: Record<string, string>
}

const emptyAccident: AccidentEntry = {
  date: '',
  nature: '',
  location: '',
  fatalities: '',
  injuries: '',
  hazmat: '',
}

const emptyTraffic: TrafficEntry = {
  date: '',
  violation: '',
  location: '',
  vehicle_type: '',
  penalty: '',
}

export function AccidentsStep({ 
  accidentData, 
  trafficData, 
  onAccidentChange, 
  onTrafficChange, 
  errors = {} 
}: AccidentsStepProps) {
  
  const inputClass = `
    w-full px-3 py-2 border border-gray-300 rounded-lg transition-colors
    focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
  `

  // Accident handlers
  const addAccident = () => {
    const newAccidents = [...(accidentData.accidents || []), { ...emptyAccident }]
    onAccidentChange({ ...accidentData, accidents: newAccidents, no_accidents: false })
  }

  const removeAccident = (index: number) => {
    const newAccidents = accidentData.accidents.filter((_, i) => i !== index)
    onAccidentChange({ ...accidentData, accidents: newAccidents })
  }

  const updateAccident = (index: number, field: keyof AccidentEntry, value: string) => {
    const newAccidents = [...accidentData.accidents]
    newAccidents[index] = { ...newAccidents[index], [field]: value }
    onAccidentChange({ ...accidentData, accidents: newAccidents })
  }

  // Traffic handlers
  const addTraffic = () => {
    const newViolations = [...(trafficData.violations || []), { ...emptyTraffic }]
    onTrafficChange({ ...trafficData, violations: newViolations, no_violations: false })
  }

  const removeTraffic = (index: number) => {
    const newViolations = trafficData.violations.filter((_, i) => i !== index)
    onTrafficChange({ ...trafficData, violations: newViolations })
  }

  const updateTraffic = (index: number, field: keyof TrafficEntry, value: string) => {
    const newViolations = [...trafficData.violations]
    newViolations[index] = { ...newViolations[index], [field]: value }
    onTrafficChange({ ...trafficData, violations: newViolations })
  }

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg">
        <h2 className="text-xl font-bold">Accident Record & Traffic Convictions</h2>
        <p className="text-orange-100 text-sm mt-1">
          List all accidents and violations from the past 3 years (per FMCSR 391.21).
        </p>
      </div>

      {/* Accident Record Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
          Accident Record (Past 3 Years)
        </h3>
        <p className="text-sm text-gray-600">
          List all accidents in which you were involved (whether or not you were at fault).
        </p>

        {/* No Accidents Checkbox */}
        <label className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100">
          <Checkbox
            checked={accidentData.no_accidents || false}
            onCheckedChange={(checked) => {
              onAccidentChange({ 
                ...accidentData, 
                no_accidents: !!checked,
                accidents: checked ? [] : accidentData.accidents 
              })
            }}
          />
          <span className="text-green-800 font-medium">
            I have had NO accidents in the past 3 years
          </span>
        </label>

        {!accidentData.no_accidents && (
          <>
            {/* Accident Entries */}
            {accidentData.accidents?.map((accident, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-700">Accident #{index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAccident(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Date</Label>
                    <Input
                      type="date"
                      value={accident.date}
                      onChange={(e) => updateAccident(index, 'date', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm text-gray-600">Nature of Accident</Label>
                    <Input
                      value={accident.nature}
                      onChange={(e) => updateAccident(index, 'nature', e.target.value)}
                      placeholder="Rear-end collision, lane departure, etc."
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-4 gap-4 mt-4">
                  <div className="md:col-span-2">
                    <Label className="text-sm text-gray-600">Location (City, State)</Label>
                    <Input
                      value={accident.location}
                      onChange={(e) => updateAccident(index, 'location', e.target.value)}
                      placeholder="Los Angeles, CA"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Fatalities</Label>
                    <Input
                      value={accident.fatalities}
                      onChange={(e) => updateAccident(index, 'fatalities', e.target.value)}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Injuries</Label>
                    <Input
                      value={accident.injuries}
                      onChange={(e) => updateAccident(index, 'injuries', e.target.value)}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Add Accident Button */}
            {(accidentData.accidents?.length || 0) < 5 && (
              <Button
                type="button"
                variant="outline"
                onClick={addAccident}
                className="w-full border-dashed border-2 border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Accident
              </Button>
            )}
          </>
        )}
      </div>

      {/* Traffic Convictions Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
          Traffic Convictions (Past 3 Years)
        </h3>
        <p className="text-sm text-gray-600">
          List all motor vehicle violations for which you were convicted (other than parking violations).
        </p>

        {/* No Violations Checkbox */}
        <label className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100">
          <Checkbox
            checked={trafficData.no_violations || false}
            onCheckedChange={(checked) => {
              onTrafficChange({ 
                ...trafficData, 
                no_violations: !!checked,
                violations: checked ? [] : trafficData.violations 
              })
            }}
          />
          <span className="text-green-800 font-medium">
            I have had NO traffic convictions in the past 3 years
          </span>
        </label>

        {!trafficData.no_violations && (
          <>
            {/* Traffic Entries */}
            {trafficData.violations?.map((violation, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-700">Violation #{index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTraffic(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Date</Label>
                    <Input
                      type="date"
                      value={violation.date}
                      onChange={(e) => updateTraffic(index, 'date', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm text-gray-600">Violation</Label>
                    <Input
                      value={violation.violation}
                      onChange={(e) => updateTraffic(index, 'violation', e.target.value)}
                      placeholder="Speeding, improper lane change, etc."
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <Label className="text-sm text-gray-600">Location (City, State)</Label>
                    <Input
                      value={violation.location}
                      onChange={(e) => updateTraffic(index, 'location', e.target.value)}
                      placeholder="Phoenix, AZ"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Vehicle Type</Label>
                    <Input
                      value={violation.vehicle_type}
                      onChange={(e) => updateTraffic(index, 'vehicle_type', e.target.value)}
                      placeholder="Semi-truck"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Penalty</Label>
                    <Input
                      value={violation.penalty}
                      onChange={(e) => updateTraffic(index, 'penalty', e.target.value)}
                      placeholder="$200 fine"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Add Violation Button */}
            {(trafficData.violations?.length || 0) < 5 && (
              <Button
                type="button"
                variant="outline"
                onClick={addTraffic}
                className="w-full border-dashed border-2 border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Violation
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

