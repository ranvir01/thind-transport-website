"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import type { DrivingExperience } from "@/types/driver-application-form"

interface ExperienceStepProps {
  data: DrivingExperience
  onChange: (field: string, value: string | boolean) => void
  errors?: Record<string, string>
}

export function ExperienceStep({ data, onChange, errors = {} }: ExperienceStepProps) {
  const inputClass = `
    w-full px-3 py-2 border border-gray-300 rounded-lg transition-colors
    focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
  `

  const equipmentTypes = [
    { id: "straight", label: "Straight Truck" },
    { id: "semi", label: "Tractor-Semitrailer" },
    { id: "doubles", label: "Tractor - Two Trailers" },
    { id: "triples", label: "Tractor - Three Trailers" },
    { id: "bus", label: "Bus" },
    { id: "other1", label: "Other" },
  ]

  const skills = [
    { id: "hazmat", label: "Hazmat Certified" },
    { id: "tanker", label: "Tanker Endorsed" },
    { id: "doubles", label: "Doubles/Triples" },
    { id: "passenger", label: "Passenger Transport" },
    { id: "oversized", label: "Oversized Loads" },
    { id: "refrigerated", label: "Refrigerated" },
    { id: "flatbed", label: "Flatbed/Tarping" },
    { id: "forklift", label: "Forklift" },
    { id: "chains", label: "Tire Chains" },
    { id: "canada", label: "Canada Experience" },
    { id: "mexico", label: "Mexico Experience" },
    { id: "twic", label: "TWIC Card" },
  ]

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg">
        <h2 className="text-xl font-bold">Driving Experience</h2>
        <p className="text-orange-100 text-sm mt-1">
          Provide details about your commercial driving experience.
        </p>
      </div>

      {/* Equipment Experience Table */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
          Driving Experience by Equipment Type
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-3 text-sm font-semibold text-gray-700 border">Equipment</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700 border">Type of Equipment</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700 border w-24">From</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700 border w-24">To</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700 border w-28">Approx. Miles</th>
              </tr>
            </thead>
            <tbody>
              {equipmentTypes.map((equip) => (
                <tr key={equip.id} className="hover:bg-gray-50">
                  <td className="p-3 border text-sm font-medium text-gray-700">{equip.label}</td>
                  <td className="p-2 border">
                    <Input
                      value={(data as any)[`exp_${equip.id}_type`] || ''}
                      onChange={(e) => onChange(`exp_${equip.id}_type`, e.target.value)}
                      placeholder="e.g., 53' Dry Van"
                      className="border-0 bg-transparent focus:ring-0 p-1 text-sm"
                    />
                  </td>
                  <td className="p-2 border">
                    <Input
                      value={(data as any)[`exp_${equip.id}_from`] || ''}
                      onChange={(e) => onChange(`exp_${equip.id}_from`, e.target.value)}
                      placeholder="MM/YY"
                      className="border-0 bg-transparent focus:ring-0 p-1 text-sm"
                    />
                  </td>
                  <td className="p-2 border">
                    <Input
                      value={(data as any)[`exp_${equip.id}_to`] || ''}
                      onChange={(e) => onChange(`exp_${equip.id}_to`, e.target.value)}
                      placeholder="MM/YY"
                      className="border-0 bg-transparent focus:ring-0 p-1 text-sm"
                    />
                  </td>
                  <td className="p-2 border">
                    <Input
                      value={(data as any)[`exp_${equip.id}_miles`] || ''}
                      onChange={(e) => onChange(`exp_${equip.id}_miles`, e.target.value)}
                      placeholder="500,000"
                      className="border-0 bg-transparent focus:ring-0 p-1 text-sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* States Operated In */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
          States Operated In (Past 5 Years)
        </h3>
        <p className="text-sm text-gray-600">
          List all states in which you have operated a commercial motor vehicle:
        </p>
        <Textarea
          value={data.states_operated || ''}
          onChange={(e) => onChange('states_operated', e.target.value)}
          placeholder="CA, AZ, NV, TX, OR, WA, UT, CO, NM..."
          className="min-h-[80px]"
        />
      </div>

      {/* Special Skills */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
          Special Equipment / Skills
        </h3>
        <p className="text-sm text-gray-600">Check all that apply:</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {skills.map((skill) => (
            <label 
              key={skill.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-orange-50 transition-colors"
            >
              <Checkbox
                checked={(data as any)[`skill_${skill.id}`] || false}
                onCheckedChange={(checked) => onChange(`skill_${skill.id}`, !!checked)}
              />
              <span className="text-sm text-gray-700">{skill.label}</span>
            </label>
          ))}
        </div>

        <div className="mt-4">
          <Label className="text-sm font-medium text-gray-700">
            Other special equipment/skills:
          </Label>
          <Input
            value={data.other_skills || ''}
            onChange={(e) => onChange('other_skills', e.target.value)}
            placeholder="List any additional skills or certifications..."
            className="mt-2"
          />
        </div>
      </div>
    </div>
  )
}

