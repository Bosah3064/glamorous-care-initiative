const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');

// IMPORTANT: Replace these with your Supabase Project URL and SERVICE ROLE KEY
const SUPABASE_URL = 'https://wbprrsuhkmdreuzhzmkq.supabase.co';
const SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DEFAULT_PASSWORD = '12345678';

// Helper function to find a key ignoring case and whitespace
function findKey(row, searchStr) {
    const search = searchStr.toLowerCase().trim();
    for (const key in row) {
        if (key.toLowerCase().trim().includes(search)) {
            return row[key];
        }
    }
    return null;
}

async function importExcel(filePath) {
    console.log(`Loading file: ${filePath}`);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; 
    const sheet = workbook.Sheets[sheetName];
    
    // Parse the sheet to JSON
    const data = xlsx.utils.sheet_to_json(sheet);
    console.log(`Found ${data.length} records. Beginning import...`);

    for (const row of data) {
        try {
            const fullName = findKey(row, 'full name') || 'Unknown Member';
            console.log(`-----------------------------------`);
            console.log(`Processing: ${fullName}`);
            
            const email = findKey(row, 'email address') || findKey(row, 'email');
            if (!email) {
                console.log(`Skipping row without email.`);
                continue;
            }

            // 1. Create User in Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: email,
                password: DEFAULT_PASSWORD,
                email_confirm: true
            });

            if (authError) {
                console.error(`Error creating auth user for ${email}:`, authError.message);
                // If user already exists, we might still want to update their profile.
                // For safety, let's skip to avoid duplicating or erroring out.
                continue;
            }

            const userId = authData.user.id;
            console.log(`Created Auth User with ID: ${userId}`);

            // 2. Extract specific form details
            const formDetails = {
                gender: findKey(row, 'gender'),
                date_of_birth: findKey(row, 'date of birth'),
                marital_status: findKey(row, 'marital status'),
                dependants: findKey(row, 'dependants'),
                next_of_kin_name: findKey(row, 'next of kin full name'),
                next_of_kin_phone: findKey(row, 'next of kin phone number')
            };

            // 3. Create Member Profile
            const { error: profileError } = await supabase.from('members').insert({
                id: userId,
                full_name: fullName,
                email: email,
                phone: findKey(row, 'phone number') || findKey(row, 'phone'),
                role: 'member',
                status: 'active',
                requires_password_reset: true,
                form_details: formDetails
            });

            if (profileError) {
                console.error(`Error creating member profile:`, profileError.message);
                continue;
            }
            console.log(`Created member profile.`);

            // 4. Import Payments (Jan to Dec columns)
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const year = new Date().getFullYear();

            for (const month of months) {
                const paymentAmountStr = findKey(row, month);
                
                if (paymentAmountStr) {
                    const amount = parseInt(paymentAmountStr.toString().replace(/,/g, ''), 10);
                    
                    if (amount > 0) {
                        const { error: paymentError } = await supabase.from('payments').insert({
                            member_id: userId,
                            member_name: fullName,
                            amount: amount,
                            month: `${month} ${year}`,
                            payment_date: new Date(`${month} 1, ${year}`).toISOString(),
                            status: 'paid',
                            reference: 'EXCEL_IMPORT'
                        });

                        if (paymentError) {
                            console.error(`Error adding payment for ${month}:`, paymentError.message);
                        } else {
                            console.log(`Added payment of KES ${amount} for ${month}`);
                        }
                    }
                }
            }

        } catch (err) {
            console.error(`Unexpected error processing row:`, err);
        }
    }
    
    console.log('Import complete!');
}

// Ensure a file path was provided
const filePath = process.argv[2];
if (!filePath) {
    console.error('Please provide the path to your file.');
    console.error('Usage: node import_excel.js path/to/members.csv');
    process.exit(1);
}

importExcel(filePath);
