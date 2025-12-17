/**
 * Generate default Offer Letter template HTML with job and candidate information
 */
export function generateDefaultOfferTemplate(
  candidateName: string,
  positionTitle: string,
  companyName: string,
  startDate?: string,
  salary?: string,
  workLocation?: string,
  department?: string,
  reportingManager?: string,
  employmentType?: string
): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const formattedStartDate = startDate 
    ? new Date(startDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : '[START DATE]'

  return `
    <div style="max-width: 800px; margin: 0 auto; padding: 40px; font-family: 'Times New Roman', serif; line-height: 1.6; font-size: 11pt;">
      <div style="text-align: right; margin-bottom: 20px; font-size: 10px;">
        <p>Reference Number: [REFERENCE NUMBER]</p>
      </div>
      
      <div style="margin-bottom: 20px; font-size: 10px;">
        <p>${currentDate}</p>
      </div>
      
      <div style="margin-bottom: 20px; font-size: 10px;">
        <p><strong>${candidateName}</strong></p>
        <p>[Candidate Address]</p>
      </div>
      
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">OFFER OF EMPLOYMENT</h1>
      </div>
      
      <div style="margin-bottom: 20px;">
        <p>Dear <strong>${candidateName}</strong>,</p>
      </div>
      
      <div style="margin-bottom: 20px; text-align: justify;">
        <p>
          We are delighted to extend to you a formal offer of employment for the position of <strong>${positionTitle}</strong> at 
          <strong> ${companyName || 'our organization'}</strong>. Based on your qualifications, experience, and our discussions, 
          we believe you will be a valuable addition to our team.
        </p>
      </div>
      
      <div style="margin-top: 30px; margin-bottom: 20px;">
        <h2 style="font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px;">POSITION DETAILS</h2>
        <ul style="margin-left: 20px; margin-bottom: 15px;">
          <li><strong>Position Title:</strong> ${positionTitle}</li>
          <li><strong>Department:</strong> ${department || '[DEPARTMENT]'}</li>
          <li><strong>Reporting Manager:</strong> ${reportingManager || '[REPORTING MANAGER]'}</li>
          <li><strong>Work Location:</strong> ${workLocation || '[WORK LOCATION]'}</li>
          <li><strong>Employment Type:</strong> ${employmentType || 'Full-time'}</li>
          <li><strong>Start Date:</strong> ${formattedStartDate}</li>
        </ul>
      </div>
      
      <div style="margin-top: 30px; margin-bottom: 20px;">
        <h2 style="font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px;">COMPENSATION</h2>
        <p style="margin-bottom: 10px; text-align: justify;">
          Your starting salary will be <strong>${salary || '[SALARY AMOUNT]'}</strong> per annum, payable in accordance with our 
          standard payroll schedule. This compensation is subject to applicable deductions and taxes as required by law.
        </p>
        <p style="margin-top: 10px; text-align: justify;">
          Your salary will be reviewed periodically based on your performance and the organization's policies. Any adjustments 
          will be communicated to you in writing.
        </p>
      </div>
      
      <div style="margin-top: 30px; margin-bottom: 20px;">
        <h2 style="font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px;">BENEFITS</h2>
        <p style="margin-bottom: 10px; text-align: justify;">
          As an employee of ${companyName || 'our organization'}, you will be eligible for the following benefits:
        </p>
        <ul style="margin-left: 20px; margin-bottom: 15px;">
          <li>Health insurance coverage as per company policy</li>
          <li>Retirement benefits and provident fund contributions</li>
          <li>Paid time off and leave benefits</li>
          <li>Professional development opportunities</li>
          <li>Other benefits as per company policy</li>
        </ul>
        <p style="margin-top: 10px; text-align: justify;">
          Detailed information about your benefits package will be provided to you during your onboarding process.
        </p>
      </div>
      
      <div style="margin-top: 30px; margin-bottom: 20px;">
        <h2 style="font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px;">PROBATION PERIOD</h2>
        <p style="margin-bottom: 10px; text-align: justify;">
          You will be on probation for a period of [PROBATION PERIOD] months from your date of joining. During this period, 
          your performance will be evaluated, and upon successful completion, you will be confirmed as a permanent employee. 
          The Management reserves the right to extend the probationary period if deemed necessary.
        </p>
        <p style="margin-top: 10px; text-align: justify;">
          Confirmation of your services will be subject to satisfactory performance and completion of all documentation 
          formalities with the HR Department.
        </p>
      </div>
      
      <div style="margin-top: 30px; margin-bottom: 20px;">
        <h2 style="font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px;">TERMS AND CONDITIONS</h2>
        <p style="margin-bottom: 15px; text-align: justify;">
          Your employment will be governed by the terms and conditions of employment as they are in force at the time of your 
          joining and as amended from time to time. You must act at all times in accordance with the lawful instructions and 
          policies of ${companyName || 'the Organization'} and comply with all reasonable directions and orders of the management.
        </p>
        <p style="margin-bottom: 15px; text-align: justify;">
          Your appointment will be subject to your antecedents being verified and found to be satisfactory. Please note that 
          in case, at any stage of your employment, if your antecedents are found to be unsatisfactory, your employment with 
          ${companyName || 'the Organization'} may be terminated.
        </p>
        <p style="margin-bottom: 15px; text-align: justify;">
          You will be required to comply with all organizational policies, procedures, and regulations as may be in force from 
          time to time, including but not limited to code of conduct, confidentiality agreements, and non-disclosure agreements.
        </p>
        <p style="margin-bottom: 15px; text-align: justify;">
          You will not divulge, either directly or indirectly, to any person or entity any knowledge or information which you 
          may acquire concerning the affairs, property, enterprise and undertaking of ${companyName || 'the Organization'}, its 
          associated companies, shareholders or subsidiaries.
        </p>
        <p style="margin-bottom: 15px; text-align: justify;">
          You are required to notify the HR Department immediately of any change in your residential address, phone number, or 
          civil status.
        </p>
      </div>
      
      <div style="margin-top: 30px; margin-bottom: 20px;">
        <h2 style="font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px;">TERMINATION</h2>
        <p style="margin-bottom: 10px; text-align: justify;">
          During the period of probation, your appointment may be terminated without assigning any reason and without any notice 
          or payment in lieu of notice.
        </p>
        <p style="margin-bottom: 10px; text-align: justify;">
          After confirmation of service, your employment may be terminated by either party giving [NOTICE PERIOD] days' notice 
          in writing or salary in lieu thereof.
        </p>
        <p style="margin-top: 10px; text-align: justify;">
          If in ${companyName || 'the Organization'}'s opinion, which shall be final and conclusive in this matter, you are found 
          guilty of any act of misconduct and violation of one or more terms of this letter, your services shall be liable to be 
          dismissed forthwith without notice or any salary in lieu of notice.
        </p>
      </div>
      
      <div style="margin-top: 30px; margin-bottom: 20px;">
        <p style="margin-bottom: 15px; text-align: justify;">
          This offer is contingent upon the satisfactory completion of background checks, verification of credentials, and any 
          other pre-employment requirements as may be specified by ${companyName || 'the Organization'}.
        </p>
        <p style="margin-bottom: 15px; text-align: justify;">
          Please acknowledge your acceptance of this offer by signing and returning this letter to the undersigned within 
          [ACCEPTANCE DEADLINE] days from the date of this letter. Your failure to respond within the specified time may result 
          in the withdrawal of this offer.
        </p>
        <p style="margin-bottom: 15px; text-align: justify;">
          We are excited about the prospect of you joining our team and look forward to a mutually beneficial and productive 
          working relationship.
        </p>
        <p style="margin-top: 20px;">Sincerely,</p>
      </div>
      
      <div style="margin-top: 50px; margin-bottom: 30px;">
        <p style="margin-bottom: 10px;">For and on behalf of:</p>
        <p style="margin-bottom: 10px;"><strong>${companyName || 'Organization Name'}</strong></p>
        <div style="margin-top: 40px; border-top: 1px solid #000; width: 250px; padding-top: 5px;">
          <p style="font-weight: bold; margin-bottom: 5px;">[SIGNATORY NAME]</p>
          <p style="font-size: 9px;">[SIGNATORY TITLE]</p>
        </div>
      </div>
      
      <div style="margin-top: 50px; margin-bottom: 30px;">
        <p style="font-style: italic; margin-bottom: 15px;">I accept this offer:</p>
        <p style="margin-bottom: 15px; text-align: justify;">
          I accept the offer of employment as ${positionTitle} at ${companyName || 'the Organization'} under the terms and 
          conditions described above. I understand that this appointment is contingent upon the satisfactory completion of 
          background checks and verification of credentials.
        </p>
        <div style="margin-top: 30px;">
          <div style="margin-bottom: 20px;">
            <p>Signature:</p>
            <div style="border-top: 1px solid #000; width: 200px; margin-top: 5px;"></div>
          </div>
          <div style="margin-bottom: 20px;">
            <p>Date:</p>
            <div style="border-top: 1px solid #000; width: 200px; margin-top: 5px;"></div>
          </div>
          <div style="margin-bottom: 20px;">
            <p>Name:</p>
            <div style="border-top: 1px solid #000; width: 200px; margin-top: 5px;"></div>
          </div>
        </div>
      </div>
    </div>
  `
}
