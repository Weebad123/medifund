use anchor_lang::prelude::*;

use crate::states::{contexts::*, MedifundError, PatientCase, PatientCaseSubmission};

use aes_gcm::{aead::{Aead, KeyInit}, Aes256Gcm, Nonce};

use base64::{Engine as _, engine::general_purpose};



// Initialize Patient Case
pub fn initialize_patient(
    ctx: Context<InitializePatientCase>, 
    case_description: String, 
    total_amount_needed: u64,
    link_to_records: String) 
    -> Result<()> {

        // Let's get the account
        let patient_details = &mut ctx.accounts.patient_case;
        let case_id_counter = &mut ctx.accounts.case_counter;
        let case_id_lookup = &mut ctx.accounts.case_lookup;

        //let current_time = Clock::get()?.unix_timestamp;
        
        let patient_case_id = format!("CASE{:04}", case_id_counter.current_id + 1);

        // update global counter
        case_id_counter.current_id += 1;

        // Patient Case ID Lookup
        case_id_lookup.case_id_in_lookup = patient_case_id.clone();
        case_id_lookup.patient_pda = patient_details.key();
        case_id_lookup.case_lookup_bump = ctx.bumps.case_lookup;
        case_id_lookup.patient_address = ctx.accounts.patient.key();

        // We Need To Encrypt The Patient's provided Link to records here
        
        let encrypted_medical_link = encrypt_link(&link_to_records)
        .map_err(|_| error!(MedifundError::EncryptionError))?;

    // Clone values to avoid rust ownership errors
    let case_description_clone = case_description.clone();
    let patient_case_id_clone = patient_case_id.clone();
    let encrypted_records_link_clone = encrypted_medical_link.clone();

        patient_details.set_inner(
            PatientCase {
                case_description,
                total_amount_needed,
                total_raised: 0,
                verification_no_votes: 0,
                is_verified: false,
                verification_yes_votes: 0,
                voted_verifiers: vec![],
                patient_pubkey: ctx.accounts.patient.key(),
                patient_case_bump: ctx.bumps.patient_case,
                case_id: patient_case_id,
                link_to_records: encrypted_medical_link,
                case_funded: false,
            }
        );

        // CATCHING THIS EVENT ON-CHAIN ANYTIME THERE IS A SUBMISSION OF CASE

        let message = format!("A patient case with ID, {} and description, {} has been successfully submitted", patient_case_id_clone, case_description_clone);
        emit!(PatientCaseSubmission {
            message,
            description: case_description_clone,
            case_id: patient_case_id_clone,
            total_needed_amount: total_amount_needed,
            link_to_records: encrypted_records_link_clone,
            is_verified: false,
            total_raised: 0
        });

        Ok(())
    }


    // On-chain Encryption Algorithm;
    fn encrypt_link(link: &str) -> Result<String> {

        const NONCE_BYTES: [u8; 12] = *b"VERIFICATION";

        let mut key = [0u8;32];
        for i in 0..32 {
            key[i] = (i as u8) ^ 0xFF;
        }

        let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|_| error!(MedifundError::KeyGenerationError))?;

        let nonce = Nonce::from_slice(&NONCE_BYTES);

        let encrypted_link = cipher
        .encrypt(nonce, link.as_bytes())
        .map_err(|_| error!(MedifundError::EncryptionError))?;

        Ok(general_purpose::STANDARD.encode(encrypted_link))
    }







    /*Actually, this is what i wanted to do in the first place. 
Upon submission of each patient case, verifiers would have a week at most, to crosscheck and validate patient's details. 
It could be that some verifiers would be able to complete even before this week elapses whiles others might be taking longer. 
So, it would be logically correct, to assume, that in case 50% of all verifiers has cast their votes at any point in time, 
and out of these 50%, 70% of these 50% vote a yes to a case, then it could imply that at least more verifiers deem the specified 
case a valid one. However, an issue arises with this such that, verifiers who would cast after the 70% of the already 50%
 would have their votes not counted at all. 

This is my reasoning. What do you think it's the best approach? if you have better suggestions, go ahead. */