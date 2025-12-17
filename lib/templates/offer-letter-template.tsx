import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// Define styles for the Offer Letter document
const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #2563eb',
    paddingBottom: 15,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
  },
  companyAddress: {
    fontSize: 9,
    color: '#666',
    marginTop: 5,
  },
  date: {
    marginTop: 20,
    marginBottom: 20,
    fontSize: 10,
  },
  recipient: {
    marginBottom: 20,
    fontSize: 10,
  },
  subject: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1e40af',
  },
  body: {
    marginBottom: 15,
    textAlign: 'justify',
  },
  paragraph: {
    marginBottom: 12,
    lineHeight: 1.6,
  },
  section: {
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1e40af',
  },
  listItem: {
    marginBottom: 8,
    marginLeft: 20,
    paddingLeft: 5,
  },
  signatureSection: {
    marginTop: 40,
    marginBottom: 20,
  },
  signatureLine: {
    marginTop: 50,
    borderTop: '1 solid #000',
    width: 200,
    paddingTop: 5,
  },
  signatureName: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  signatureTitle: {
    fontSize: 9,
    color: '#666',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
    borderTop: '1 solid #eee',
    paddingTop: 10,
  },
  highlight: {
    fontWeight: 'bold',
    color: '#1e40af',
  },
})

interface OfferLetterData {
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

interface OfferLetterTemplateProps {
  data: OfferLetterData
}

export const OfferLetterTemplate: React.FC<OfferLetterTemplateProps> = ({ data }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    } catch {
      return dateString
    }
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>
            {data.companyName || 'Company Name'}
          </Text>
          {data.companyAddress && (
            <Text style={styles.companyAddress}>{data.companyAddress}</Text>
          )}
        </View>

        {/* Date */}
        <View style={styles.date}>
          <Text>Date: {formatDate(data.generatedDate || new Date().toISOString())}</Text>
        </View>

        {/* Recipient */}
        <View style={styles.recipient}>
          <Text>{data.candidateName}</Text>
          <Text>{data.workLocation}</Text>
        </View>

        {/* Subject */}
        <View style={styles.subject}>
          <Text>Subject: Offer of Employment - {data.positionTitle}</Text>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.paragraph}>
            Dear {data.candidateName},
          </Text>

          <Text style={styles.paragraph}>
            We are delighted to extend to you a formal offer of employment for the position of{' '}
            <Text style={styles.highlight}>{data.positionTitle}</Text> at{' '}
            {data.companyName || 'our organization'}. Based on your qualifications and our discussions, 
            we believe you will be a valuable addition to our team.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Position Details:</Text>
            <Text style={styles.listItem}>• Position Title: {data.positionTitle}</Text>
            <Text style={styles.listItem}>• Department: {data.department}</Text>
            <Text style={styles.listItem}>• Reporting Manager: {data.reportingManager}</Text>
            <Text style={styles.listItem}>• Work Location: {data.workLocation}</Text>
            <Text style={styles.listItem}>• Employment Type: {data.employmentType}</Text>
            <Text style={styles.listItem}>• Start Date: {formatDate(data.startDate)}</Text>
            {data.noticePeriod && (
              <Text style={styles.listItem}>• Notice Period: {data.noticePeriod} days</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Compensation:</Text>
            <Text style={styles.paragraph}>
              Your starting salary will be <Text style={styles.highlight}>{data.salary}</Text> per annum, 
              payable in accordance with our standard payroll schedule. This compensation is subject to 
              applicable deductions and taxes as required by law.
            </Text>
          </View>

          {data.benefits && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Benefits:</Text>
              <Text style={styles.paragraph}>{data.benefits}</Text>
            </View>
          )}

          {data.termsAndConditions && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Terms and Conditions:</Text>
              <Text style={styles.paragraph}>{data.termsAndConditions}</Text>
            </View>
          )}

          {data.additionalNotes && (
            <View style={styles.section}>
              <Text style={styles.paragraph}>{data.additionalNotes}</Text>
            </View>
          )}

          <Text style={styles.paragraph}>
            This offer is contingent upon the successful completion of any remaining pre-employment 
            requirements, including but not limited to background checks and verification of credentials.
          </Text>

          <Text style={styles.paragraph}>
            We are excited about the prospect of you joining our team and look forward to your positive response. 
            Please confirm your acceptance of this offer by signing and returning this letter within the specified timeframe.
          </Text>

          <Text style={styles.paragraph}>
            We welcome you to {data.companyName || 'our organization'} and wish you every success in your new role.
          </Text>

          <Text style={styles.paragraph}>
            Sincerely,
          </Text>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureLine}>
            <Text style={styles.signatureName}>Authorized Signatory</Text>
            <Text style={styles.signatureTitle}>
              {data.companyName || 'Company Name'}
            </Text>
          </View>
        </View>

        {/* Acceptance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acceptance:</Text>
          <Text style={styles.paragraph}>
            I accept the terms and conditions of this offer of employment.
          </Text>
          <View style={styles.signatureLine}>
            <Text style={styles.signatureName}>Candidate Signature</Text>
            <Text style={styles.signatureTitle}>Date: _______________</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>This is a confidential document. Please do not share without authorization.</Text>
        </View>
      </Page>
    </Document>
  )
}

