import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// Define styles for the LOI document (Professional standard format)
const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  referenceNumber: {
    fontSize: 10,
    marginBottom: 20,
    textAlign: 'right',
  },
  date: {
    fontSize: 10,
    marginBottom: 20,
  },
  recipient: {
    fontSize: 10,
    marginBottom: 20,
  },
  mainHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  greeting: {
    fontSize: 11,
    marginBottom: 15,
  },
  body: {
    marginBottom: 15,
    textAlign: 'justify',
  },
  paragraph: {
    marginBottom: 12,
    lineHeight: 1.6,
    fontSize: 11,
  },
  section: {
    marginTop: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  listItem: {
    marginBottom: 8,
    marginLeft: 15,
    fontSize: 11,
    lineHeight: 1.6,
  },
  salaryTable: {
    marginTop: 10,
    marginBottom: 10,
  },
  salaryRow: {
    flexDirection: 'row',
    marginBottom: 5,
    fontSize: 11,
  },
  salaryLabel: {
    width: 150,
  },
  salaryValue: {
    flex: 1,
  },
  signatureSection: {
    marginTop: 50,
    marginBottom: 30,
  },
  signatureBlock: {
    marginTop: 40,
  },
  signatureLine: {
    borderTop: '1 solid #000',
    width: 250,
    paddingTop: 5,
    marginBottom: 5,
  },
  signatureName: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 5,
  },
  signatureTitle: {
    fontSize: 9,
    marginTop: 2,
  },
  acceptanceSection: {
    marginTop: 40,
    marginBottom: 20,
  },
  acceptanceText: {
    fontSize: 10,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  acceptanceFields: {
    marginTop: 30,
  },
  acceptanceField: {
    marginTop: 20,
    fontSize: 10,
  },
  acceptanceLine: {
    borderTop: '1 solid #000',
    width: 200,
    marginTop: 5,
  },
})

interface LOIData {
  candidateName: string
  candidateAddress?: string
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
}

interface LOITemplateProps {
  data: LOIData
}

export const LOITemplate: React.FC<LOITemplateProps> = ({ data }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      const day = date.getDate()
      const month = date.toLocaleDateString('en-US', { month: 'long' })
      const year = date.getFullYear()
      const daySuffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'
      return `${month} ${day}${daySuffix}, ${year}`
    } catch {
      return dateString
    }
  }

  const formatDateShort = (dateString: string) => {
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
        {/* Reference Number */}
        {data.referenceNumber && (
          <View style={styles.referenceNumber}>
            <Text>{data.referenceNumber}</Text>
          </View>
        )}

        {/* Date */}
        <View style={styles.date}>
          <Text>{formatDate(data.generatedDate || new Date().toISOString())}</Text>
        </View>

        {/* Recipient */}
        <View style={styles.recipient}>
          <Text>{data.candidateName}</Text>
          {data.candidateAddress && (
            <Text>{data.candidateAddress}</Text>
          )}
        </View>

        {/* Main Heading */}
        <View style={styles.mainHeading}>
          <Text>LETTER OF INTENT</Text>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.greeting}>
            Dear {data.candidateName}
          </Text>

          <Text style={styles.paragraph}>
            We are pleased to extend to you a Letter of Intent for the position of{' '}
            <Text style={{ fontWeight: 'bold' }}>{data.positionTitle}</Text> at{' '}
            {data.companyName || 'our organization'}. This letter outlines our intent to offer you employment, subject to the terms and conditions set forth below and your particulars being verified and found to be satisfactory.
          </Text>

          {/* COMMENCEMENT OF APPOINTMENT */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>COMMENCEMENT OF APPOINTMENT</Text>
            <Text style={styles.listItem}>
              • Your appointment will commence from {formatDateShort(data.startDate)}.
            </Text>
            <Text style={styles.listItem}>
              • Your appointment will be subject to the following terms and your particulars being verified and found to be satisfactory.
            </Text>
          </View>

          {/* LIABILITY OF SERVICE */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>LIABILITY OF SERVICE</Text>
            <Text style={styles.listItem}>
              • You will be placed in {data.workLocation}, during your training period. However, your services are subject to transfer based on {data.companyName || 'the Organization'}'s operational requirements.
            </Text>
            {data.additionalNotes && (
              <Text style={styles.listItem}>
                • {data.additionalNotes}
              </Text>
            )}
            {!data.additionalNotes && (
              <Text style={styles.listItem}>
                • You will be required to comply with all organizational policies, procedures, and regulations as may be in force from time to time.
              </Text>
            )}
          </View>

          {/* SALARY */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SALARY</Text>
            <Text style={styles.paragraph}>
              Your total emoluments will be {data.salary} as per details given below:
            </Text>
            <View style={styles.salaryTable}>
              {data.basicSalary && (
                <View style={styles.salaryRow}>
                  <Text style={styles.salaryLabel}>a) Basic Salary:</Text>
                  <Text style={styles.salaryValue}>Rupees {data.basicSalary}</Text>
                </View>
              )}
              {data.allowances && (
                <View style={styles.salaryRow}>
                  <Text style={styles.salaryLabel}>b) Allowances:</Text>
                  <Text style={styles.salaryValue}>Rupees {data.allowances}</Text>
                </View>
              )}
              <View style={styles.salaryRow}>
                <Text style={styles.salaryLabel}>Total:</Text>
                <Text style={styles.salaryValue}>{data.salary}</Text>
              </View>
            </View>
            <Text style={styles.paragraph}>
              The above compensation is subject to applicable deductions and taxes as required by law.
            </Text>
          </View>

          {/* PROBATION */}
          {data.probationPeriod && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PROBATION</Text>
              <Text style={styles.listItem}>
                • You will be on probation for a period of {data.probationPeriod} in the first instance or until such time {data.companyName || 'the Organization'} at its sole discretion, confirms in writing that you have successfully completed your probationary period. However, on completion of this probationary period, your performance will be reviewed and if found successful and satisfactory, you will be confirmed as a member of the permanent staff which will make you eligible for all other staff benefits. The Management reserves the right to extend the probationary period from time to time.
              </Text>
              <Text style={styles.listItem}>
                • Confirmation of your services will be on hold till completion of all documentation formalities with HR Department.
              </Text>
            </View>
          )}

          {/* TERMINATION OF APPOINTMENT */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TERMINATION OF APPOINTMENT</Text>
            {data.probationPeriod && (
              <Text style={styles.listItem}>
                During the period of probation, your appointment may be terminated without assigning any reason and any notice or any payment in lieu of notice.
              </Text>
            )}
            {data.probationPeriod && (
              <Text style={styles.listItem}>
                After completion of probationary period, your appointment may be terminated at any time subject to the following conditions:
              </Text>
            )}
            <Text style={styles.listItem}>
              • If in {data.companyName || 'the Organization'}'s opinion, which shall be final and conclusive in this matter, you are found guilty of any act of misconduct and violation of one or more terms of this letter, your services shall be liable to be dismissed forthwith without a notice whatsoever or any salary in lieu of notice.
            </Text>
            {data.noticePeriod && (
              <Text style={styles.listItem}>
                • After confirmation of service, your employment would be liable to be terminated by either party giving {data.noticePeriod} notice in writing or salary in lieu thereof.
              </Text>
            )}
            {!data.noticePeriod && !data.probationPeriod && (
              <Text style={styles.listItem}>
                • Your employment may be terminated by either party giving appropriate notice in writing or salary in lieu thereof, as per organizational policy.
              </Text>
            )}
          </View>

          {/* OTHER RULES AND REGULATIONS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>OTHER RULES AND REGULATIONS</Text>
            <Text style={styles.paragraph}>
              Your appointment will be governed by terms and conditions of employment as they are in force at the time of your joining and as amended from time to time. You must act at all times in accordance with the lawful instructions and policies of {data.companyName || 'the Organization'} and comply with all reasonable direction / order of the management of {data.companyName || 'the Organization'} and the authorized persons / officers of {data.companyName || 'the Organization'}.
            </Text>
            <Text style={styles.paragraph}>
              Your appointment will be subject to your antecedents being verified and found to be satisfactory. Please note that in case, at any stage of your employment, if your antecedents are found to be unsatisfactory, your employment with {data.companyName || 'the Organization'} may be terminated.
            </Text>
            <Text style={styles.paragraph}>
              This letter of intent does not entail any authority to contract or make commitment for or on behalf of {data.companyName || 'the Organization'} nor to represent {data.companyName || 'the Organization'} in any matter not specifically authorized. You will not hold yourself out as having any authority to bind any client of {data.companyName || 'the Organization'} or to incur any liability on behalf of such client, and shall at all times act in accordance with the instructions provided by {data.companyName || 'the Organization'} in all your dealings with any third parties.
            </Text>
            {data.termsAndConditions && (
              <Text style={styles.paragraph}>
                {data.termsAndConditions}
              </Text>
            )}
            <Text style={styles.paragraph}>
              You will not divulge, either directly or indirectly, to any person or entity any knowledge or information which you may acquire concerning the affairs, property, enterprise and undertaking of {data.companyName || 'the Organization'}, its associated companies, shareholders or subsidiaries. Furthermore, you shall not take or remove from the premises of {data.companyName || 'the Organization'} without authority of management, any data, tables, calculations, letters and or other document or items of property or confidential information pertaining to {data.companyName || 'the Organization'}'s business and or affairs, in any form (paper, diskette, tape, CD, optical or magnetic etc.).
            </Text>
            <Text style={styles.paragraph}>
              You will be responsible for the safe custody and return in good condition and order, of all {data.companyName || 'the Organization'}'s property, which may be in your use, custody, care or charge. {data.companyName || 'The Organization'} shall have the right to deduct the money value of all such things from your dues and take such other actions as deems proper in the event of your failure to account for such property to {data.companyName || 'the Organization'}'s satisfaction.
            </Text>
            <Text style={styles.paragraph}>
              You are required to notify HR Department immediately of any change in your residential address, phone number or in your civil status.
            </Text>
          </View>

          <Text style={styles.paragraph}>
            Please note that this is a Letter of Intent and not a formal offer of employment. A formal offer letter will be issued upon your acceptance of this intent and completion of any remaining pre-employment requirements, including but not limited to background checks and verification of credentials.
          </Text>

          <Text style={styles.paragraph}>
            Please acknowledge this letter by the way of formal acceptance by signing and returning this letter to undersigned, with your original signature.
          </Text>

          <Text style={styles.paragraph}>
            We welcome you to {data.companyName || 'our organization'} and trust that our employment relationship will be mutually satisfying and productive.
          </Text>

          <Text style={styles.paragraph}>
            Sincerely,
          </Text>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <Text style={styles.paragraph}>For and on behalf of:</Text>
          <Text style={styles.paragraph}>{data.companyName || 'Organization Name'}</Text>
          
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureName}>
                {data.signatoryName || 'Authorized Signatory'}
              </Text>
              {data.signatoryTitle && (
                <Text style={styles.signatureTitle}>
                  {data.signatoryTitle}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Acceptance Section */}
        <View style={styles.acceptanceSection}>
          <Text style={styles.acceptanceText}>I concur:</Text>
          <Text style={styles.paragraph}>
            I accept all the terms and conditions of this Letter of Intent as {data.positionTitle} under {data.companyName || 'the Organization'}'s policies and terms described above, with the understanding that this appointment is contingent upon the satisfactory completion of employment reference check and certificates.
          </Text>
          
          <View style={styles.acceptanceFields}>
            <View style={styles.acceptanceField}>
              <Text>Signature:</Text>
              <View style={styles.acceptanceLine}></View>
            </View>
            <View style={styles.acceptanceField}>
              <Text>Date:</Text>
              <View style={styles.acceptanceLine}></View>
            </View>
            <View style={styles.acceptanceField}>
              <Text>Name:</Text>
              <View style={styles.acceptanceLine}></View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

