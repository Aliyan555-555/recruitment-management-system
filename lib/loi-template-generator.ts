/**
 * Generate default LOI template HTML with job and candidate information
 */
export function generateDefaultLOITemplate(
  candidateName: string,
  positionTitle: string,
  companyName: string
): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

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
        <h1 style="font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">LETTER OF INTENT</h1>
      </div>
      
      <div style="margin-bottom: 20px;">
        <p>Dear <strong>${candidateName}</strong>,</p>
      </div>
      
      <div style="margin-bottom: 20px; text-align: justify;">
        <p>
          We are pleased to extend to you a Letter of Intent for the position of <strong>${positionTitle}</strong> at 
          <strong> ${companyName || 'our organization'}</strong>. This letter outlines our intent to offer you employment, 
          subject to the terms and conditions set forth below and your particulars being verified and found to be satisfactory.
        </p>
      </div>
      
      <div style="margin-top: 30px; margin-bottom: 20px;">
        <h2 style="font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px;">COMMENCEMENT OF APPOINTMENT</h2>
        <ul style="margin-left: 20px; margin-bottom: 15px;">
          <li>Your appointment will commence from [START DATE].</li>
          <li>Your appointment will be subject to the following terms and your particulars being verified and found to be satisfactory.</li>
        </ul>
      </div>
      
      <div style="margin-top: 30px; margin-bottom: 20px;">
        <h2 style="font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px;">LIABILITY OF SERVICE</h2>
        <ul style="margin-left: 20px; margin-bottom: 15px;">
          <li>You will be placed in [WORK LOCATION], during your training period. However, your services are subject to transfer based on ${companyName || 'the Organization'}'s operational requirements.</li>
          <li>You will be required to comply with all organizational policies, procedures, and regulations as may be in force from time to time.</li>
        </ul>
      </div>
      
      <div style="margin-top: 30px; margin-bottom: 20px;">
        <h2 style="font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px;">SALARY</h2>
        <p style="margin-bottom: 10px;">
          Your total emoluments will be [SALARY AMOUNT] as per details given below:
        </p>
        <div style="margin-left: 20px; margin-bottom: 15px;">
          <p>a) Basic Salary: Rupees [BASIC SALARY]</p>
          <p>b) Allowances: Rupees [ALLOWANCES]</p>
          <p><strong>Total: [TOTAL SALARY]</strong></p>
        </div>
        <p style="margin-top: 10px;">
          The above compensation is subject to applicable deductions and taxes as required by law.
        </p>
      </div>
      
      <div style="margin-top: 30px; margin-bottom: 20px;">
        <h2 style="font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px;">PROBATION</h2>
        <ul style="margin-left: 20px; margin-bottom: 15px;">
          <li>
            You will be on probation for a period of [PROBATION PERIOD] in the first instance or until such time 
            ${companyName || 'the Organization'} at its sole discretion, confirms in writing that you have successfully 
            completed your probationary period. However, on completion of this probationary period, your performance will 
            be reviewed and if found successful and satisfactory, you will be confirmed as a member of the permanent staff 
            which will make you eligible for all other staff benefits. The Management reserves the right to extend the 
            probationary period from time to time.
          </li>
          <li>Confirmation of your services will be on hold till completion of all documentation formalities with HR Department.</li>
        </ul>
      </div>
      
      <div style="margin-top: 30px; margin-bottom: 20px;">
        <h2 style="font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px;">TERMINATION OF APPOINTMENT</h2>
        <ul style="margin-left: 20px; margin-bottom: 15px;">
          <li>During the period of probation, your appointment may be terminated without assigning any reason and any notice or any payment in lieu of notice.</li>
          <li>After completion of probationary period, your appointment may be terminated at any time subject to the following conditions:</li>
          <li>If in ${companyName || 'the Organization'}'s opinion, which shall be final and conclusive in this matter, you are found guilty of any act of misconduct and violation of one or more terms of this letter, your services shall be liable to be dismissed forthwith without a notice whatsoever or any salary in lieu of notice.</li>
          <li>After confirmation of service, your employment would be liable to be terminated by either party giving [NOTICE PERIOD] notice in writing or salary in lieu thereof.</li>
        </ul>
      </div>
      
      <div style="margin-top: 30px; margin-bottom: 20px;">
        <h2 style="font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px;">OTHER RULES AND REGULATIONS</h2>
        <p style="margin-bottom: 15px; text-align: justify;">
          Your appointment will be governed by terms and conditions of employment as they are in force at the time of your 
          joining and as amended from time to time. You must act at all times in accordance with the lawful instructions and 
          policies of ${companyName || 'the Organization'} and comply with all reasonable direction / order of the management 
          of ${companyName || 'the Organization'} and the authorized persons / officers of ${companyName || 'the Organization'}.
        </p>
        <p style="margin-bottom: 15px; text-align: justify;">
          Your appointment will be subject to your antecedents being verified and found to be satisfactory. Please note that 
          in case, at any stage of your employment, if your antecedents are found to be unsatisfactory, your employment with 
          ${companyName || 'the Organization'} may be terminated.
        </p>
        <p style="margin-bottom: 15px; text-align: justify;">
          This letter of intent does not entail any authority to contract or make commitment for or on behalf of 
          ${companyName || 'the Organization'} nor to represent ${companyName || 'the Organization'} in any matter not 
          specifically authorized. You will not hold yourself out as having any authority to bind any client of 
          ${companyName || 'the Organization'} or to incur any liability on behalf of such client, and shall at all times act 
          in accordance with the instructions provided by ${companyName || 'the Organization'} in all your dealings with any 
          third parties.
        </p>
        <p style="margin-bottom: 15px; text-align: justify;">
          You will not divulge, either directly or indirectly, to any person or entity any knowledge or information which you 
          may acquire concerning the affairs, property, enterprise and undertaking of ${companyName || 'the Organization'}, its 
          associated companies, shareholders or subsidiaries. Furthermore, you shall not take or remove from the premises of 
          ${companyName || 'the Organization'} without authority of management, any data, tables, calculations, letters and or 
          other document or items of property or confidential information pertaining to ${companyName || 'the Organization'}'s 
          business and or affairs, in any form (paper, diskette, tape, CD, optical or magnetic etc.).
        </p>
        <p style="margin-bottom: 15px; text-align: justify;">
          You will be responsible for the safe custody and return in good condition and order, of all 
          ${companyName || 'the Organization'}'s property, which may be in your use, custody, care or charge. 
          ${companyName || 'The Organization'} shall have the right to deduct the money value of all such things from your dues 
          and take such other actions as deems proper in the event of your failure to account for such property to 
          ${companyName || 'the Organization'}'s satisfaction.
        </p>
        <p style="margin-bottom: 15px; text-align: justify;">
          You are required to notify HR Department immediately of any change in your residential address, phone number or in your 
          civil status.
        </p>
      </div>
      
      <div style="margin-top: 30px; margin-bottom: 20px;">
        <p style="margin-bottom: 15px; text-align: justify;">
          Please note that this is a Letter of Intent and not a formal offer of employment. A formal offer letter will be issued 
          upon your acceptance of this intent and completion of any remaining pre-employment requirements, including but not 
          limited to background checks and verification of credentials.
        </p>
        <p style="margin-bottom: 15px; text-align: justify;">
          Please acknowledge this letter by the way of formal acceptance by signing and returning this letter to undersigned, 
          with your original signature.
        </p>
        <p style="margin-bottom: 15px; text-align: justify;">
          We welcome you to ${companyName || 'our organization'} and trust that our employment relationship will be mutually 
          satisfying and productive.
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
        <p style="font-style: italic; margin-bottom: 15px;">I concur:</p>
        <p style="margin-bottom: 15px; text-align: justify;">
          I accept all the terms and conditions of this Letter of Intent as ${positionTitle} under 
          ${companyName || 'the Organization'}'s policies and terms described above, with the understanding that this appointment 
          is contingent upon the satisfactory completion of employment reference check and certificates.
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

