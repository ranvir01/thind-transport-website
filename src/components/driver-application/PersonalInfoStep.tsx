"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, User } from "lucide-react"

const schema = z.object({
  firstName: z.string().min(2, "Required"),
  lastName: z.string().min(2, "Required"),
  dateOfBirth: z.string().min(8, "MM/DD/YYYY required"),
  age: z.string().min(1, "Required"),
  socialSecurityNumber: z.string().regex(/^\d{3}-\d{2}-\d{4}$/, "Format: XXX-XX-XXXX"),
  phone: z.string().min(10, "Required"),
  emergencyPhone: z.string().min(10, "Required"),
  physicalExamExpiration: z.string().min(8, "MM/DD/YYYY required"),
  currentAddress: z.object({
    street: z.string().min(5, "Required"),
    city: z.string().min(2, "Required"),
    state: z.string().length(2, "2-letter code"),
    zip: z.string().length(5, "5 digits"),
    from: z.string().min(5, "MM/YYYY"),
    to: z.string().min(5, "MM/YYYY or 'Present'"),
  }),
  workedForCompanyBefore: z.boolean(),
  educationLevel: z.string().min(1, "Required"),
})

type FormData = z.infer<typeof schema>

interface Props {
  onNext: (data: { personalInfo: FormData }) => void
  initialData?: Partial<FormData>
}

export function PersonalInfoStep({ onNext, initialData }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData || {},
  })

  const onSubmit = (data: FormData) => {
    onNext({ personalInfo: data })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-orange" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input {...register("firstName")} />
              {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input {...register("lastName")} />
              {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Date of Birth * (MM/DD/YYYY)</Label>
              <Input {...register("dateOfBirth")} placeholder="01/15/1990" />
              {errors.dateOfBirth && <p className="text-xs text-red-600 mt-1">{errors.dateOfBirth.message}</p>}
            </div>
            <div>
              <Label>Age *</Label>
              <Input {...register("age")} type="number" />
              {errors.age && <p className="text-xs text-red-600 mt-1">{errors.age.message}</p>}
            </div>
            <div>
              <Label>SSN * (XXX-XX-XXXX)</Label>
              <Input {...register("socialSecurityNumber")} placeholder="123-45-6789" />
              {errors.socialSecurityNumber && <p className="text-xs text-red-600 mt-1">{errors.socialSecurityNumber.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone *</Label>
              <Input {...register("phone")} type="tel" />
              {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <Label>Emergency Contact Phone *</Label>
              <Input {...register("emergencyPhone")} type="tel" />
              {errors.emergencyPhone && <p className="text-xs text-red-600 mt-1">{errors.emergencyPhone.message}</p>}
            </div>
          </div>

          <div>
            <Label>Physical Exam Expiration Date * (MM/DD/YYYY)</Label>
            <Input {...register("physicalExamExpiration")} placeholder="12/31/2025" />
            {errors.physicalExamExpiration && <p className="text-xs text-red-600 mt-1">{errors.physicalExamExpiration.message}</p>}
          </div>

          {/* Current Address */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Current Address (Last 3 Years Required)</h3>
            <div className="space-y-4">
              <div>
                <Label>Street Address *</Label>
                <Input {...register("currentAddress.street")} />
                {errors.currentAddress?.street && <p className="text-xs text-red-600 mt-1">{errors.currentAddress.street.message}</p>}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>City *</Label>
                  <Input {...register("currentAddress.city")} />
                  {errors.currentAddress?.city && <p className="text-xs text-red-600 mt-1">{errors.currentAddress.city.message}</p>}
                </div>
                <div>
                  <Label>State *</Label>
                  <Input {...register("currentAddress.state")} placeholder="WA" maxLength={2} />
                  {errors.currentAddress?.state && <p className="text-xs text-red-600 mt-1">{errors.currentAddress.state.message}</p>}
                </div>
                <div>
                  <Label>ZIP *</Label>
                  <Input {...register("currentAddress.zip")} maxLength={5} />
                  {errors.currentAddress?.zip && <p className="text-xs text-red-600 mt-1">{errors.currentAddress.zip.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>From (MM/YYYY) *</Label>
                  <Input {...register("currentAddress.from")} placeholder="01/2022" />
                  {errors.currentAddress?.from && <p className="text-xs text-red-600 mt-1">{errors.currentAddress.from.message}</p>}
                </div>
                <div>
                  <Label>To (MM/YYYY) *</Label>
                  <Input {...register("currentAddress.to")} placeholder="Present" />
                  {errors.currentAddress?.to && <p className="text-xs text-red-600 mt-1">{errors.currentAddress.to.message}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Previous Employment */}
          <div className="border-t pt-4">
            <Label>Have you worked for this company before?</Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2">
                <input type="radio" {...register("workedForCompanyBefore")} value="true" />
                Yes
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" {...register("workedForCompanyBefore")} value="false" />
                No
              </label>
            </div>
          </div>

          <div>
            <Label>Highest Education Level *</Label>
            <select {...register("educationLevel")} className="w-full border rounded-md p-2">
              <option value="">Select...</option>
              <option value="12">High School Graduate</option>
              <option value="13">Some College</option>
              <option value="14">College 2 Years</option>
              <option value="16">College 4 Years</option>
              <option value="17">Post Graduate</option>
            </select>
            {errors.educationLevel && <p className="text-xs text-red-600 mt-1">{errors.educationLevel.message}</p>}
          </div>

          <Button type="submit" className="w-full">
            Continue to Employment History
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}

