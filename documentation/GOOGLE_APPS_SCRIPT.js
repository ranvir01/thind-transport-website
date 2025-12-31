/**
 * Thind Transport Website - Information Gathering Form Builder
 * 
 * HOW TO USE:
 * 1. Open your Google Form: https://docs.google.com/forms/d/1nzOutqu1GVFNV2Dfd58HKkTFvlYJuDsnP5rUL0AWkco/edit
 * 2. Click on the 3 dots menu (⋮) in the top right
 * 3. Select "Script editor" (or go to Extensions > Apps Script)
 * 4. Delete any existing code and paste this entire script
 * 5. Click the "Run" button (play icon) 
 * 6. Grant permissions when prompted
 * 7. Wait for the script to complete (it will show "Execution completed")
 * 8. Go back to your form - all questions will be added!
 */

function buildThindTransportForm() {
  // Get the active form
  var form = FormApp.getActiveForm();
  
  // Clear existing items (except title/description)
  var items = form.getItems();
  for (var i = items.length - 1; i >= 0; i--) {
    form.deleteItem(i);
  }
  
  // Set form title and description
  form.setTitle('Thind Transport Website - Information Gathering');
  form.setDescription('Please complete this form to help us create an accurate, professional website for Thind Transport. All information will be used to update website content. This should take approximately 20-30 minutes.');
  
  // ========================================
  // SECTION 1: Company Identity & History
  // ========================================
  form.addPageBreakItem()
    .setTitle('Section 1: Company Identity & History')
    .setHelpText('Basic company information and history');
  
  form.addTextItem()
    .setTitle('Company Legal Name')
    .setHelpText('e.g., Thind Transport LLC')
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('Year Founded')
    .setHelpText('e.g., 2016')
    .setRequired(true);
  
  form.addTextItem()
    .setTitle("Owner's Full Name")
    .setRequired(true);
  
  form.addTextItem()
    .setTitle("Owner's Title")
    .setHelpText('e.g., Founder & CEO, Owner, President')
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('How many years of trucking experience does the owner have?')
    .setHelpText('e.g., 20+')
    .setRequired(true);
  
  form.addParagraphTextItem()
    .setTitle('Company Mission/Tagline')
    .setHelpText('Current tagline is "Creating better futures for everyone" - would you like to keep this or suggest something different?');
  
  form.addParagraphTextItem()
    .setTitle('Company Origin Story')
    .setHelpText('How did the company start? We\'d like to share your story on the About Us page. (Example: "Started with one truck in 2016...")');
  
  // ========================================
  // SECTION 2: Contact Information
  // ========================================
  form.addPageBreakItem()
    .setTitle('Section 2: Contact Information')
    .setHelpText('How drivers and partners can reach you');
  
  form.addTextItem()
    .setTitle('Main Phone Number')
    .setHelpText('Current: (206) 765-9218')
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('Main Email Address')
    .setHelpText('Current: thindcarrier@gmail.com')
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('Mailing Address')
    .setHelpText('Current: PO Box 5114, Kent, WA 98064')
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('Physical Office Address (if different from mailing)')
    .setHelpText('Leave blank if same as mailing address');
  
  form.addMultipleChoiceItem()
    .setTitle('Dispatch Support Hours')
    .setChoiceValues(['24/7', 'Monday-Friday', 'Monday-Saturday', 'Other (specify in next question)'])
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('If not 24/7, what are your specific hours?')
    .setHelpText('e.g., 6am-10pm PST');
  
  // ========================================
  // SECTION 3: Legal & Compliance
  // ========================================
  form.addPageBreakItem()
    .setTitle('Section 3: Legal & Compliance')
    .setHelpText('DOT, MC, and safety information - CRITICAL to verify');
  
  form.addTextItem()
    .setTitle('DOT Number')
    .setHelpText('Current on website: 2893456')
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('MC Number')
    .setHelpText('⚠️ IMPORTANT: Currently showing placeholder "123456" - please provide your actual MC number')
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('Liability Insurance Coverage Amount')
    .setHelpText('e.g., $1,000,000')
    .setRequired(true);
  
  form.addMultipleChoiceItem()
    .setTitle('FMCSA Safety Rating')
    .setChoiceValues(['Satisfactory', 'Conditional', 'Unsatisfactory', 'Not Rated', 'I\'m not sure'])
    .setRequired(true);
  
  form.addParagraphTextItem()
    .setTitle('Any additional certifications or compliance badges?')
    .setHelpText('List any other certifications you want to display');
  
  // ========================================
  // SECTION 4: Fleet & Equipment
  // ========================================
  form.addPageBreakItem()
    .setTitle('Section 4: Fleet & Equipment')
    .setHelpText('Information about your trucks and trailers');
  
  form.addTextItem()
    .setTitle('How many trucks are in your fleet?')
    .setHelpText('Current on website: 15')
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('How many active drivers do you currently have?')
    .setRequired(true);
  
  form.addCheckboxItem()
    .setTitle('What truck makes/models do you operate? (Select all that apply)')
    .setChoiceValues(['Freightliner', 'Kenworth', 'Peterbilt', 'Volvo', 'International', 'Mack', 'Western Star', 'Other'])
    .setRequired(true);
  
  form.addMultipleChoiceItem()
    .setTitle('Average age of your trucks')
    .setChoiceValues(['Newer than 3 years', '3-5 years', '5-7 years', '7-10 years', 'Mixed fleet ages'])
    .setRequired(true);
  
  form.addCheckboxItem()
    .setTitle('What trailer types do you operate? (Select all that apply)')
    .setChoiceValues(['Flatbed', 'Reefer (Refrigerated)', 'Dry Van', 'Step Deck', 'Conestoga', 'Other'])
    .setRequired(true);
  
  form.addCheckboxItem()
    .setTitle('Trailer sizes (Select all that apply)')
    .setChoiceValues(['48 ft', '53 ft', 'Other'])
    .setRequired(true);
  
  form.addMultipleChoiceItem()
    .setTitle('Do you have in-house mechanical support?')
    .setChoiceValues(['Yes, full in-house shop', 'Yes, basic in-house support', 'No, we use third-party shops'])
    .setRequired(true);
  
  form.addMultipleChoiceItem()
    .setTitle('Do you offer 24/7 roadside assistance?')
    .setChoiceValues(['Yes', 'No', 'Through a third-party service'])
    .setRequired(true);
  
  form.addMultipleChoiceItem()
    .setTitle('Do you offer fuel card programs?')
    .setChoiceValues(['Yes', 'No'])
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('If yes, what fuel discounts are available?')
    .setHelpText('e.g., "$0.50/gallon off at Pilot/Flying J"');
  
  // ========================================
  // SECTION 5: Owner Operator Pay & Terms
  // ========================================
  form.addPageBreakItem()
    .setTitle('Section 5: Owner Operator Pay & Terms')
    .setHelpText('Compensation details for owner operators - CRITICAL to verify');
  
  form.addTextItem()
    .setTitle('Owner Operator Commission Percentage')
    .setHelpText('Current on website: 91% - What percentage of gross revenue do O/Os keep?')
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('Realistic Annual Gross Range for O/Os')
    .setHelpText('Current on website: $150,000 - $250,000')
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('Average Rate Per Mile for O/Os')
    .setHelpText('Current on website: $2.50 - $3.50')
    .setRequired(true);
  
  form.addMultipleChoiceItem()
    .setTitle('Fuel Surcharge Policy')
    .setChoiceValues(['100% passed through to driver', 'Percentage passed through (specify below)', 'Included in commission', 'Other'])
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('If not 100% fuel surcharge pass-through, what percentage?');
  
  form.addTextItem()
    .setTitle('Owner Operator Sign-On Bonus')
    .setHelpText('Current on website: $2,500 - Enter $0 if no sign-on bonus')
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('How is the O/O sign-on bonus paid?')
    .setHelpText('e.g., "Split over first 3 months"');
  
  form.addParagraphTextItem()
    .setTitle('Are there ANY fees or deductions for O/Os?')
    .setHelpText('Please list all fees (insurance, dispatch fee, admin fees, etc.) or write "No fees"')
    .setRequired(true);
  
  form.addMultipleChoiceItem()
    .setTitle('Settlement/Pay Frequency for O/Os')
    .setChoiceValues(['Weekly (every Friday)', 'Weekly (other day)', 'Bi-weekly', 'Other'])
    .setRequired(true);
  
  // ========================================
  // SECTION 6: Company Driver Pay & Benefits
  // ========================================
  form.addPageBreakItem()
    .setTitle('Section 6: Company Driver Pay & Benefits')
    .setHelpText('Compensation details for company drivers');
  
  form.addTextItem()
    .setTitle('Company Driver Pay Per Mile')
    .setHelpText('Current on website: $0.50 - $0.60')
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('Realistic Annual Earnings for Company Drivers')
    .setHelpText('Current on website: $65,000 - $95,000')
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('Company Driver Sign-On Bonus')
    .setHelpText('Current on website: $1,000 - Enter $0 if no sign-on bonus')
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('How is the company driver sign-on bonus paid?')
    .setHelpText('e.g., "Paid over first year" or "After 90 days"');
  
  form.addMultipleChoiceItem()
    .setTitle('Do you offer Health Insurance?')
    .setChoiceValues(['Yes, company paid', 'Yes, employee contributes', 'No'])
    .setRequired(true);
  
  form.addMultipleChoiceItem()
    .setTitle('Do you offer Dental Insurance?')
    .setChoiceValues(['Yes', 'No'])
    .setRequired(true);
  
  form.addMultipleChoiceItem()
    .setTitle('Do you offer Vision Insurance?')
    .setChoiceValues(['Yes', 'No'])
    .setRequired(true);
  
  form.addMultipleChoiceItem()
    .setTitle('Do you offer 401(k) Retirement Plan?')
    .setChoiceValues(['Yes, with company match', 'Yes, no company match', 'No'])
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('If 401(k) with match, what is the match percentage?')
    .setHelpText('e.g., "100% match up to 3%"');
  
  form.addMultipleChoiceItem()
    .setTitle('Do you offer Paid Time Off (PTO)?')
    .setChoiceValues(['Yes', 'No'])
    .setRequired(true);
  
  form.addMultipleChoiceItem()
    .setTitle('Do you offer Holiday Pay?')
    .setChoiceValues(['Yes', 'No'])
    .setRequired(true);
  
  form.addMultipleChoiceItem()
    .setTitle('Do you have a Performance Bonus program?')
    .setChoiceValues(['Yes', 'No'])
    .setRequired(true);
  
  form.addParagraphTextItem()
    .setTitle('If yes, please describe the performance bonus');
  
  form.addMultipleChoiceItem()
    .setTitle('Do you have a Driver Referral Bonus program?')
    .setChoiceValues(['Yes', 'No'])
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('If yes, how much is the referral bonus?');
  
  // ========================================
  // SECTION 7: Routes & Coverage
  // ========================================
  form.addPageBreakItem()
    .setTitle('Section 7: Routes & Coverage')
    .setHelpText('Where drivers run and home time policies');
  
  form.addMultipleChoiceItem()
    .setTitle('Do you offer LOCAL routes (home daily)?')
    .setChoiceValues(['Yes', 'No'])
    .setRequired(true);
  
  form.addParagraphTextItem()
    .setTitle('Local route details (if applicable)')
    .setHelpText('Radius from Kent, WA? Typical schedule? Average daily miles?');
  
  form.addMultipleChoiceItem()
    .setTitle('Do you offer REGIONAL routes (home weekly)?')
    .setChoiceValues(['Yes', 'No'])
    .setRequired(true);
  
  form.addParagraphTextItem()
    .setTitle('Regional route details (if applicable)')
    .setHelpText('What states? How often home? Average weekly miles?');
  
  form.addMultipleChoiceItem()
    .setTitle('Do you offer OTR routes (over-the-road)?')
    .setChoiceValues(['Yes', 'No'])
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('OTR home time policy (if applicable)')
    .setHelpText('e.g., "2-3 weeks out, 3-4 days home"');
  
  form.addParagraphTextItem()
    .setTitle('What states do you primarily cover?')
    .setHelpText('e.g., "West Coast states: WA, OR, CA" or "All 48 states"')
    .setRequired(true);
  
  form.addParagraphTextItem()
    .setTitle('What types of freight do you typically haul?')
    .setHelpText('e.g., Building materials, food/grocery, retail goods, automotive, etc.')
    .setRequired(true);
  
  form.addMultipleChoiceItem()
    .setTitle('Is freight consistent year-round or seasonal?')
    .setChoiceValues(['Consistent year-round', 'Somewhat seasonal', 'Very seasonal'])
    .setRequired(true);
  
  // ========================================
  // SECTION 8: Hiring Requirements
  // ========================================
  form.addPageBreakItem()
    .setTitle('Section 8: Hiring Requirements')
    .setHelpText('What drivers need to qualify');
  
  form.addTextItem()
    .setTitle('Minimum OTR experience required for Owner Operators')
    .setHelpText('Current on website: 2 years')
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('Minimum experience required for Company Drivers')
    .setHelpText('Current on website: 1 year')
    .setRequired(true);
  
  form.addMultipleChoiceItem()
    .setTitle('Minimum age requirement')
    .setChoiceValues(['21 years old', '23 years old', '25 years old', 'Other'])
    .setRequired(true);
  
  form.addMultipleChoiceItem()
    .setTitle('Do you accept recent CDL school graduates?')
    .setChoiceValues(['Yes', 'No', 'Case by case'])
    .setRequired(true);
  
  form.addMultipleChoiceItem()
    .setTitle('Do you accept team drivers?')
    .setChoiceValues(['Yes', 'No'])
    .setRequired(true);
  
  form.addMultipleChoiceItem()
    .setTitle('How long does the application-to-start process typically take?')
    .setChoiceValues(['Less than 1 week', '1-2 weeks', '2-3 weeks', 'More than 3 weeks'])
    .setRequired(true);
  
  form.addMultipleChoiceItem()
    .setTitle('Is there paid orientation?')
    .setChoiceValues(['Yes, paid orientation', 'Orientation but not paid', 'No formal orientation'])
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('How long is orientation?')
    .setHelpText('e.g., "1 day" or "3 days"');
  
  // ========================================
  // SECTION 9: Real Testimonials
  // ========================================
  form.addPageBreakItem()
    .setTitle('Section 9: Real Driver Testimonials ⭐')
    .setHelpText('IMPORTANT: We need REAL driver testimonials to replace placeholder content on the website. Please provide at least 2-3 if possible.');
  
  form.addSectionHeaderItem()
    .setTitle('Driver Testimonial #1');
  
  form.addTextItem()
    .setTitle('Testimonial #1 - Driver Name')
    .setHelpText('First name and last initial (e.g., "James K.") or full name if they consent');
  
  form.addTextItem()
    .setTitle('Testimonial #1 - Role & Duration')
    .setHelpText('e.g., "Owner Operator, 3 years"');
  
  form.addParagraphTextItem()
    .setTitle('Testimonial #1 - Quote')
    .setHelpText('What do they say about working with Thind Transport?');
  
  form.addTextItem()
    .setTitle('Testimonial #1 - Earnings (optional)')
    .setHelpText('If they\'re willing to share earnings, this is very persuasive for recruiting');
  
  form.addSectionHeaderItem()
    .setTitle('Driver Testimonial #2');
  
  form.addTextItem()
    .setTitle('Testimonial #2 - Driver Name');
  
  form.addTextItem()
    .setTitle('Testimonial #2 - Role & Duration');
  
  form.addParagraphTextItem()
    .setTitle('Testimonial #2 - Quote');
  
  form.addTextItem()
    .setTitle('Testimonial #2 - Earnings (optional)');
  
  form.addSectionHeaderItem()
    .setTitle('Driver Testimonial #3');
  
  form.addTextItem()
    .setTitle('Testimonial #3 - Driver Name');
  
  form.addTextItem()
    .setTitle('Testimonial #3 - Role & Duration');
  
  form.addParagraphTextItem()
    .setTitle('Testimonial #3 - Quote');
  
  form.addTextItem()
    .setTitle('Testimonial #3 - Earnings (optional)');
  
  form.addParagraphTextItem()
    .setTitle('Any driver SUCCESS STORIES to share?')
    .setHelpText('e.g., "Driver started with us 3 years ago with 1 truck, now runs 3 trucks grossing $70K/month"');
  
  // ========================================
  // SECTION 10: Team & Partners
  // ========================================
  form.addPageBreakItem()
    .setTitle('Section 10: Team & Partners')
    .setHelpText('Your dispatch team and business relationships');
  
  form.addTextItem()
    .setTitle('How many people are on your dispatch team?')
    .setRequired(true);
  
  form.addParagraphTextItem()
    .setTitle('Would you like to feature any dispatch team members by name?')
    .setHelpText('Names and titles (e.g., "Sarah - Senior Dispatcher"). Leave blank if you prefer not to show names.');
  
  form.addCheckboxItem()
    .setTitle('Which freight brokers do you work with? (Select all that apply)')
    .setChoiceValues(['Landstar', 'JB Hunt', 'C.H. Robinson', 'Schneider', 'Coyote Logistics', 'DAT', 'TQL', 'Echo', 'XPO Logistics', 'Other']);
  
  form.addParagraphTextItem()
    .setTitle('Do you haul for any well-known companies?')
    .setHelpText('e.g., Amazon, Walmart, Home Depot, Target, Costco, etc. Only list if we can mention them publicly.');
  
  // ========================================
  // SECTION 11: Social Media
  // ========================================
  form.addPageBreakItem()
    .setTitle('Section 11: Social Media')
    .setHelpText('Your online presence');
  
  form.addTextItem()
    .setTitle('Facebook Page URL')
    .setHelpText('e.g., https://facebook.com/thindtransport');
  
  form.addTextItem()
    .setTitle('Instagram URL')
    .setHelpText('e.g., https://instagram.com/thindtransport');
  
  form.addTextItem()
    .setTitle('LinkedIn Company Page URL');
  
  form.addTextItem()
    .setTitle('YouTube Channel URL (if any)');
  
  form.addMultipleChoiceItem()
    .setTitle('Do you have a Google Business Profile?')
    .setChoiceValues(['Yes', 'No', 'I\'m not sure'])
    .setRequired(true);
  
  // ========================================
  // SECTION 12: Photos & Branding
  // ========================================
  form.addPageBreakItem()
    .setTitle('Section 12: Photos & Branding')
    .setHelpText('Visual assets for the website');
  
  form.addMultipleChoiceItem()
    .setTitle('Do you have a company logo file?')
    .setChoiceValues(['Yes, I can provide it', 'No, we need one created', 'We use text only (no logo)'])
    .setRequired(true);
  
  form.addMultipleChoiceItem()
    .setTitle('Do you have photos of your actual trucks?')
    .setChoiceValues(['Yes, I can provide them', 'No'])
    .setRequired(true);
  
  form.addMultipleChoiceItem()
    .setTitle('Do you have photos of drivers (with their permission)?')
    .setChoiceValues(['Yes', 'No'])
    .setRequired(true);
  
  form.addMultipleChoiceItem()
    .setTitle('Do you have photos of your office/dispatch team?')
    .setChoiceValues(['Yes', 'No'])
    .setRequired(true);
  
  form.addParagraphTextItem()
    .setTitle('Preferred brand colors')
    .setHelpText('Current website uses Navy Blue (#001F3F) and Safety Orange (#FF9500). Do you want to keep these or prefer different colors?');
  
  // ========================================
  // SECTION 13: Final Questions
  // ========================================
  form.addPageBreakItem()
    .setTitle('Section 13: Final Questions')
    .setHelpText('Your vision and what makes you different');
  
  form.addParagraphTextItem()
    .setTitle('What makes Thind Transport DIFFERENT from competitors?')
    .setHelpText('Why should a driver choose you over a mega carrier like Swift or Werner?')
    .setRequired(true);
  
  form.addTextItem()
    .setTitle('What is the ONE THING you want drivers to remember about your company?')
    .setRequired(true);
  
  form.addCheckboxItem()
    .setTitle('What types of drivers are you most looking to hire right now?')
    .setChoiceValues(['Owner Operators', 'Company Drivers (Local)', 'Company Drivers (Regional)', 'Company Drivers (OTR)', 'Team Drivers', 'All of the above'])
    .setRequired(true);
  
  form.addParagraphTextItem()
    .setTitle('Any expansion plans you\'d like mentioned?')
    .setHelpText('e.g., "Adding 5 more trucks this year", "Expanding to East Coast"');
  
  form.addParagraphTextItem()
    .setTitle('Is there anything else we should know?')
    .setHelpText('Any additional information that should be on the website');
  
  // Log completion
  Logger.log('Form created successfully with all sections and questions!');
  Logger.log('Form URL: ' + form.getEditUrl());
}























