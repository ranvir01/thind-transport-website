/**
 * DOT Driver Application PDF Generator
 * Generates PDF matching the format from Thind Transport Application.pdf
 */

import PDFDocument from "pdfkit"
import type { DriverApplicationData } from "@/types/driver-application"

export async function generateDriverApplicationPDF(data: DriverApplicationData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      })

      const chunks: Buffer[] = []

      doc.on("data", (chunk) => chunks.push(chunk))
      doc.on("end", () => resolve(Buffer.concat(chunks)))

      // Header
      doc.fontSize(16).font("Helvetica-Bold").text("DRIVER APPLICATION FOR EMPLOYMENT", { align: "center" })
      doc.fontSize(10).font("Helvetica-Bold").text("THIND TRANSPORT LLC", { align: "center" })
      doc.fontSize(9).font("Helvetica").text("FMCSA Compliant - 49 CFR Part 391", { align: "center" })
      doc.moveDown(1.5)

      // Personal Information Section
      doc.fontSize(11).font("Helvetica-Bold").text("PERSONAL INFORMATION")
      doc.moveDown(0.3)

      const { personalInfo } = data
      doc.fontSize(9).font("Helvetica")
      doc.text(`Name: ${personalInfo.firstName} ${personalInfo.lastName}`)
      doc.text(`Date of Birth: ${personalInfo.dateOfBirth}     Age: ${personalInfo.age}`)
      doc.text(`Social Security Number: ${personalInfo.socialSecurityNumber}`)
      doc.text(`Phone: ${personalInfo.phone}     Emergency Contact: ${personalInfo.emergencyPhone}`)
      doc.text(`Physical Exam Expiration: ${personalInfo.physicalExamExpiration}`)
      doc.moveDown(0.5)

      doc.text("Current Address:")
      doc.text(`${personalInfo.currentAddress.street}`)
      doc.text(`${personalInfo.currentAddress.city}, ${personalInfo.currentAddress.state} ${personalInfo.currentAddress.zip}`)
      doc.text(`Resided from: ${personalInfo.currentAddress.from} to ${personalInfo.currentAddress.to}`)
      doc.moveDown(0.5)

      doc.text(`Worked for company before: ${personalInfo.workedForCompanyBefore ? "Yes" : "No"}`)
      doc.text(`Education Level: ${personalInfo.educationLevel} years`)
      doc.moveDown(1)

      // Employment History Section
      doc.addPage()
      doc.fontSize(11).font("Helvetica-Bold").text("EMPLOYMENT HISTORY (Past 3 Years Required by DOT)")
      doc.moveDown(0.5)

      data.employmentHistory.entries.forEach((entry, index) => {
        doc.fontSize(10).font("Helvetica-Bold").text(`Employer #${index + 1}`)
        doc.fontSize(9).font("Helvetica")
        doc.text(`Dates: ${entry.fromDate} to ${entry.toDate}`)
        doc.text(`Employer: ${entry.employerName}`)
        doc.text(`Position: ${entry.position}`)
        doc.text(`Address: ${entry.address}`)
        doc.text(`Phone: ${entry.phone}`)
        doc.text(`Reason for Leaving: ${entry.reasonForLeaving}`)
        doc.text(`Subject to FMCSRs: ${entry.subjectToFMCSR ? "Yes" : "No"}`)
        doc.text(`Safety-Sensitive Function: ${entry.safetyFunctioning ? "Yes" : "No"}`)
        doc.moveDown(0.8)
      })

      // Driving Record Section
      doc.addPage()
      doc.fontSize(11).font("Helvetica-Bold").text("DRIVING RECORD & CDL INFORMATION")
      doc.moveDown(0.5)

      const { drivingRecord } = data
      const cdl = drivingRecord.cdlLicenses[0]

      doc.fontSize(9).font("Helvetica-Bold").text("Commercial Driver's License:")
      doc.font("Helvetica")
      doc.text(`License Number: ${cdl.licenseNumber}`)
      doc.text(`State: ${cdl.state}`)
      doc.text(`Type/Class: ${cdl.type}`)
      doc.text(`Endorsements: ${cdl.endorsements || "None"}`)
      doc.text(`Expiration Date: ${cdl.expirationDate}`)
      doc.moveDown(0.8)

      doc.font("Helvetica-Bold").text("License History:")
      doc.font("Helvetica")
      doc.text(`Ever denied a license: ${drivingRecord.deniedLicense ? "YES" : "NO"}`)
      if (drivingRecord.deniedLicense) {
        doc.text(`Explanation: ${drivingRecord.deniedLicenseExplanation}`)
      }
      doc.text(`Ever suspended/revoked: ${drivingRecord.suspendedLicense ? "YES" : "NO"}`)
      if (drivingRecord.suspendedLicense) {
        doc.text(`Explanation: ${drivingRecord.suspendedLicenseExplanation}`)
      }
      doc.text(`Felony conviction: ${drivingRecord.felonyConviction ? "YES" : "NO"}`)
      if (drivingRecord.felonyConviction) {
        doc.text(`Explanation: ${drivingRecord.felonyConvictionExplanation}`)
      }
      doc.moveDown(0.5)

      doc.text(`Accidents (past 3 years): ${drivingRecord.accidents.length}`)
      doc.text(`Traffic violations (past 3 years): ${drivingRecord.violations.length}`)
      doc.moveDown(1)

      // Experience & Qualifications Section
      doc.addPage()
      doc.fontSize(11).font("Helvetica-Bold").text("EXPERIENCE & QUALIFICATIONS")
      doc.moveDown(0.5)

      const { experienceQualifications } = data
      
      doc.fontSize(9).font("Helvetica-Bold").text("Driving Experience - Tractor and Semi-Trailer:")
      doc.font("Helvetica")
      experienceQualifications.drivingExperience.forEach((exp) => {
        doc.text(`Type: ${exp.typeOfEquipment || "N/A"}`)
        doc.text(`Dates: ${exp.dateFrom} to ${exp.dateTo}`)
        doc.text(`Approximate Miles: ${exp.approximateMiles || "N/A"}`)
      })
      doc.moveDown(0.5)

      doc.text(`States Operated In: ${experienceQualifications.statesOperated.join(", ")}`)
      doc.moveDown(0.5)

      if (experienceQualifications.specialCourses) {
        doc.text(`Special Courses: ${experienceQualifications.specialCourses}`)
      }
      if (experienceQualifications.safetyAwards) {
        doc.text(`Safety Awards: ${experienceQualifications.safetyAwards}`)
      }
      if (experienceQualifications.otherTraining) {
        doc.text(`Other Training: ${experienceQualifications.otherTraining}`)
      }
      if (experienceQualifications.specialEquipment) {
        doc.text(`Special Equipment: ${experienceQualifications.specialEquipment}`)
      }
      doc.moveDown(1)

      // PSP Authorization Section
      doc.addPage()
      doc.fontSize(11).font("Helvetica-Bold").text("PRE-EMPLOYMENT SCREENING PROGRAM (PSP) AUTHORIZATION")
      doc.moveDown(0.5)

      doc.fontSize(9).font("Helvetica")
      doc.text(
        "I acknowledge that I have received the FMCSA PSP Disclosure document. I understand that this prospective " +
        "employer may obtain information about my safety performance from the FMCSA Pre-Employment Screening Program (PSP)."
      )
      doc.moveDown(0.5)

      const { pspAuthorization } = data
      doc.text("✓ Acknowledged PSP Disclosure")
      doc.text("✓ Authorized background check and safety performance review")
      doc.text("✓ Understand data can be requested for review and correction")
      doc.text("✓ Understand crash data (5 years) and inspection data (3 years) will be displayed")
      doc.text("✓ Understand information used solely for safety-sensitive employment decisions")
      doc.moveDown(1)

      doc.fontSize(10).font("Helvetica-Bold").text("APPLICANT SIGNATURE:")
      doc.fontSize(9).font("Helvetica")
      doc.text(`Signature: ${pspAuthorization.fullName}`)
      doc.text(`Date: ${pspAuthorization.signatureDate}`)
      doc.moveDown(1)

      // Certification Statement
      doc.fontSize(8).font("Helvetica").text(
        "I certify that all information provided in this application is true and complete to the best of my knowledge. " +
        "I understand that any false statements or omissions may disqualify me from employment or result in dismissal " +
        "if discovered at a later date. I authorize Thind Transport LLC to conduct investigations as deemed necessary, " +
        "including verification of former employers, criminal background checks, and motor vehicle record checks as " +
        "permitted under 49 CFR Part 391.",
        { align: "justify" }
      )
      doc.moveDown(1)

      // Footer
      doc.fontSize(8).font("Helvetica-Oblique").text(
        `Generated: ${new Date().toLocaleString('en-US')}`,
        { align: "center" }
      )
      doc.text("THIND TRANSPORT LLC - USDOT #4052236 - MC #1472882", { align: "center" })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

