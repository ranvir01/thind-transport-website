"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle } from "lucide-react"
import type { AddressHistory } from "@/types/driver-application-form"

interface AddressHistoryStepProps {
  data: AddressHistory
  onChange: (field: string, value: string | boolean) => void
  errors?: Record<string, string>
}

export function AddressHistoryStep({ data, onChange, errors = {} }: AddressHistoryStepProps) {
  const RequiredMark = () => <span className="text-red-500 ml-1">*</span>
  
  const inputClass = (field: string) => `
    w-full px-3 py-2 border rounded-lg transition-colors
    ${errors[field] ? 'border-red-500 bg-red-50' : 'border-gray-300'}
    focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
  `

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg">
        <h2 className="text-xl font-bold">Address History</h2>
        <p className="text-orange-100 text-sm mt-1">
          List all addresses where you have lived in the past 3 years.
        </p>
      </div>

      {/* Address 1 - Current */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
          Current Address<RequiredMark />
        </h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="addr1_street" className="text-sm font-medium text-gray-700">
              Street Address, City, State, ZIP
            </Label>
            <Input
              id="addr1_street"
              value={data.addr1_street || ''}
              onChange={(e) => onChange('addr1_street', e.target.value)}
              placeholder="123 Main St, Los Angeles, CA 90001"
              className={inputClass('addr1_street')}
            />
            {errors.addr1_street && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.addr1_street}
              </p>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="addr1_from" className="text-sm font-medium text-gray-700">
                From (Month/Year)<RequiredMark />
              </Label>
              <Input
                id="addr1_from"
                value={data.addr1_from || ''}
                onChange={(e) => onChange('addr1_from', e.target.value)}
                placeholder="01/2022"
                className={inputClass('addr1_from')}
              />
            </div>
            <div>
              <Label htmlFor="addr1_to" className="text-sm font-medium text-gray-700">
                To (Month/Year)
              </Label>
              <Input
                id="addr1_to"
                value={data.addr1_to || ''}
                onChange={(e) => onChange('addr1_to', e.target.value)}
                placeholder="Present"
                className={inputClass('addr1_to')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Address 2 */}
      <div className="bg-white border border-gray-200 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span className="bg-gray-400 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
          Previous Address (if applicable)
        </h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="addr2_street" className="text-sm font-medium text-gray-700">
              Street Address, City, State, ZIP
            </Label>
            <Input
              id="addr2_street"
              value={data.addr2_street || ''}
              onChange={(e) => onChange('addr2_street', e.target.value)}
              placeholder="456 Oak Ave, San Diego, CA 92101"
              className={inputClass('addr2_street')}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="addr2_from" className="text-sm font-medium text-gray-700">
                From (Month/Year)
              </Label>
              <Input
                id="addr2_from"
                value={data.addr2_from || ''}
                onChange={(e) => onChange('addr2_from', e.target.value)}
                placeholder="06/2020"
                className={inputClass('addr2_from')}
              />
            </div>
            <div>
              <Label htmlFor="addr2_to" className="text-sm font-medium text-gray-700">
                To (Month/Year)
              </Label>
              <Input
                id="addr2_to"
                value={data.addr2_to || ''}
                onChange={(e) => onChange('addr2_to', e.target.value)}
                placeholder="12/2021"
                className={inputClass('addr2_to')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Address 3 */}
      <div className="bg-white border border-gray-200 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span className="bg-gray-400 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
          Previous Address (if applicable)
        </h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="addr3_street" className="text-sm font-medium text-gray-700">
              Street Address, City, State, ZIP
            </Label>
            <Input
              id="addr3_street"
              value={data.addr3_street || ''}
              onChange={(e) => onChange('addr3_street', e.target.value)}
              placeholder=""
              className={inputClass('addr3_street')}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="addr3_from" className="text-sm font-medium text-gray-700">
                From (Month/Year)
              </Label>
              <Input
                id="addr3_from"
                value={data.addr3_from || ''}
                onChange={(e) => onChange('addr3_from', e.target.value)}
                className={inputClass('addr3_from')}
              />
            </div>
            <div>
              <Label htmlFor="addr3_to" className="text-sm font-medium text-gray-700">
                To (Month/Year)
              </Label>
              <Input
                id="addr3_to"
                value={data.addr3_to || ''}
                onChange={(e) => onChange('addr3_to', e.target.value)}
                className={inputClass('addr3_to')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Worked Before */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-4">Previous Employment with Thind Transport</h3>
        
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <span className="text-sm text-gray-700">
            Have you ever worked for this company before?
          </span>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={data.worked_before_yes || false}
                onCheckedChange={(checked) => {
                  onChange('worked_before_yes', !!checked)
                  if (checked) onChange('worked_before_no', false)
                }}
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={data.worked_before_no || false}
                onCheckedChange={(checked) => {
                  onChange('worked_before_no', !!checked)
                  if (checked) onChange('worked_before_yes', false)
                }}
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        </div>

        {data.worked_before_yes && (
          <div className="grid md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-blue-200">
            <div>
              <Label htmlFor="worked_before_from" className="text-sm font-medium text-gray-700">
                From
              </Label>
              <Input
                id="worked_before_from"
                value={data.worked_before_from || ''}
                onChange={(e) => onChange('worked_before_from', e.target.value)}
                placeholder="01/2018"
                className={inputClass('worked_before_from')}
              />
            </div>
            <div>
              <Label htmlFor="worked_before_to" className="text-sm font-medium text-gray-700">
                To
              </Label>
              <Input
                id="worked_before_to"
                value={data.worked_before_to || ''}
                onChange={(e) => onChange('worked_before_to', e.target.value)}
                placeholder="06/2019"
                className={inputClass('worked_before_to')}
              />
            </div>
            <div>
              <Label htmlFor="worked_before_reason" className="text-sm font-medium text-gray-700">
                Reason for Leaving
              </Label>
              <Input
                id="worked_before_reason"
                value={data.worked_before_reason || ''}
                onChange={(e) => onChange('worked_before_reason', e.target.value)}
                className={inputClass('worked_before_reason')}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

