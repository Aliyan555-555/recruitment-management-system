import React from 'react'
import { renderToStream } from '@react-pdf/renderer'
import { LOITemplate } from './templates/loi-template'
import { OfferLetterTemplate } from './templates/offer-letter-template'

export interface LOIData {
  candidateName: string
  candidateAddress?: string
  phone?: string
  positionTitle: string
  startDate: string
  salary: string
  basicSalary?: string
  allowances?: string
  reportingManager: string
  department: string
  workLocation: string
  validityFrom: string
  validityTo: string
  termsAndConditions: string
  additionalNotes?: string
  companyName?: string
  companyAddress?: string
  generatedDate?: string
  referenceNumber?: string
  signatoryName?: string
  signatoryTitle?: string
  probationPeriod?: string
  noticePeriod?: string
  // New fields from Soneri Bank form
  minimumJobPeriod?: string
  grade?: string
  agreementAmount?: string
  servingPeriod?: string
  letterValidationDays?: string
  agreementSubmitDate?: string
  documentSubmissionDate?: string
  designation1?: string
  designation1Name?: string
  designation2?: string
  designation2Name?: string
}

export interface OfferLetterData {
  candidateName: string
  positionTitle: string
  startDate: string
  salary: string
  benefits: string
  reportingManager: string
  department: string
  workLocation: string
  employmentType: string
  noticePeriod: string
  termsAndConditions: string
  additionalNotes?: string
  companyName?: string
  companyAddress?: string
  generatedDate?: string
}

/**
 * Convert stream to buffer
 */
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = []
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

/**
 * Generate LOI PDF buffer from template and data
 */
export async function generateLOIPDF(data: LOIData): Promise<Buffer> {
  try {
    const pdfDocument = React.createElement(LOITemplate, { data } as any)
    const stream = await renderToStream(pdfDocument as any)
    const buffer = await streamToBuffer(stream)
    return buffer
  } catch (error) {
    console.error('Error generating LOI PDF:', error)
    throw new Error('Failed to generate LOI PDF')
  }
}

/**
 * Generate Offer Letter PDF buffer from template and data
 */
export async function generateOfferLetterPDF(data: OfferLetterData): Promise<Buffer> {
  try {
    const pdfDocument = React.createElement(OfferLetterTemplate, { data } as any)
    const stream = await renderToStream(pdfDocument as any)
    const buffer = await streamToBuffer(stream)
    return buffer
  } catch (error) {
    console.error('Error generating Offer Letter PDF:', error)
    throw new Error('Failed to generate Offer Letter PDF')
  }
}

/**
 * Generate LOI PDF and return as Response for download
 */
export async function generateLOIPDFResponse(data: LOIData): Promise<Response> {
  const buffer = await generateLOIPDF(data)
  const filename = `LOI_${data.candidateName.replace(/\s+/g, '_')}_${Date.now()}.pdf`
  
  return new Response(buffer as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    },
  })
}

/**
 * Generate Offer Letter PDF and return as Response for download
 */
export async function generateOfferLetterPDFResponse(data: OfferLetterData): Promise<Response> {
  const buffer = await generateOfferLetterPDF(data)
  const filename = `OfferLetter_${data.candidateName.replace(/\s+/g, '_')}_${Date.now()}.pdf`
  
  return new Response(buffer as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    },
  })
}

