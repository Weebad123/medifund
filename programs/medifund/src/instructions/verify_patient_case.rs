

use anchor_lang::{prelude::*, solana_program::{self, rent::Rent/*, system_program system_instruction*/}};

use solana_program::pubkey::Pubkey;

use crate::states::{constants::SCALE, contexts::*, errors::*, PatientCaseVerificationStatus};


// Let's Write The Actual Verification Instruction
// Where The Verifiers Will Specify the CASE_ID of the original format,
// and then vote on the verification status of the patient case.
pub fn approve_patient_case(ctx: Context<VerifyPatientCase>, case_id: String, is_yes: bool) -> Result<()> {
    // let's get the accounts under this context

    let patient_details = &mut ctx.accounts.patient_case;
    let verifier_to_vote = ctx.accounts.verifier.key();
    let total_verifiers = ctx.accounts.verifiers_list.all_verifiers.len();

    // first check that patient case has not been already verified
    require!(patient_details.is_verified == false, MedifundError::CaseAlreadyVerified);

    //Check if verifier has already voted on this particular case,
    require!(
        patient_details.voted_verifiers.contains(&verifier_to_vote) == false,
        MedifundError::VerifierAlreadyVoted
    );

    // Let's record the respective votes,    
    match is_yes {
        true => patient_details.verification_yes_votes = patient_details.verification_yes_votes.checked_add(1).ok_or(MedifundError::OverflowError)?,
        false => patient_details.verification_no_votes = patient_details.verification_no_votes.checked_add(1).ok_or(MedifundError::OverflowError)?,
    };

    // Let's add the verifier to the voted verifiers list.
    patient_details.voted_verifiers.push(verifier_to_vote);

    // Let's get the total votes
    let total_votes = patient_details.verification_yes_votes.checked_add(patient_details.verification_no_votes).ok_or(MedifundError::OverflowError)?;

    // Let's type cast both total_votes and total_verifiers to u32 and SCALE to avoid overflow and precision loss
    let total_votes_u32_scaled = (total_votes as u32).checked_mul(SCALE).ok_or(MedifundError::OverflowError)?;
    let total_verifiers_u32_scaled = (total_verifiers as u32).checked_mul(SCALE).ok_or(MedifundError::OverflowError)?;

    //Let's get Half Verifiers
    let half_verifiers_scaled = total_verifiers_u32_scaled.checked_mul(50).ok_or(MedifundError::OverflowError)?
        .checked_div(100).ok_or(MedifundError::OverflowError)?;
    // Now, if total votes is 50% >= total_verifiers, it means more than half have voted.
    if total_votes_u32_scaled > half_verifiers_scaled {
        // Now, let's check if yes votes is 70% of total votes, then we mark patient case as verified.
        // Let's get a 70% approval threshold
        let approval_threshold_70_scaled = total_votes_u32_scaled.checked_mul(70).ok_or(MedifundError::OverflowError)?
            .checked_div(100).ok_or(MedifundError::OverflowError)?;

        let yes_votes_scaled = (patient_details.verification_yes_votes as u32).checked_mul(SCALE).ok_or(MedifundError::OverflowError)?;

        if yes_votes_scaled >= approval_threshold_70_scaled {
            patient_details.is_verified = true;

            // Go Ahead and create the Patient Escrow PDA Account
            create_escrow_pda(ctx)?;

            // CATCHING THIS EVENT ON-CHAIN ANYTIME THIS INSTRUCTION OCCURS
            let message = format!("Patient Case With ID, {} has successfully been verified!!!", case_id);
            let current_time = Clock::get()?.unix_timestamp;
            emit!(
                PatientCaseVerificationStatus{
                    message,
                    case_id,
                    is_verified: true,
                    timestamp: current_time,
                }
            );
        } else {
            // If not, we keep the patient case as unverified. 
            patient_details.is_verified = false;

        }
    } 

    Ok(())
}

fn create_escrow_pda(ctx: Context<VerifyPatientCase>) -> Result<()> {

    
    let patient_case_key = ctx.accounts.patient_case.key();

    let case_id_lookup = &mut ctx.accounts.case_lookup;

    // Get Escrow PDA address using find_program_address
    let (patient_escrow_pda, _patient_escrow_bump) = Pubkey::find_program_address(
        &[b"patient_escrow", ctx.accounts.patient_case.case_id.as_bytes(), patient_case_key.as_ref()],
        ctx.program_id
    );

    // Verify passed PDA account matches derived one
    require!(
        *ctx.accounts.patient_escrow.key == patient_escrow_pda, MedifundError::InvalidEscrowPDA
    );
    
    // Let's store the patient_escrow pda bump into a field in the case_lookup 
    case_id_lookup.patient_escrow_bump = _patient_escrow_bump;

    let rent = Rent::get()?;
    let space = 0;
    let lamports = rent.minimum_balance(space);

      //Create the Escrow PDA Account, setting program_id as owner
    let create_escrow_ix = solana_program::system_instruction::create_account(
        &ctx.accounts.verifier.key(),
        &patient_escrow_pda,
        lamports,
        0,
        &solana_program::system_program::ID,
    );

    let accounts_needed = &[
        ctx.accounts.verifier.to_account_info(),
        ctx.accounts.patient_escrow.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
    ];

    let seeds = &[
        b"patient_escrow",
        ctx.accounts.patient_case.case_id.as_bytes().as_ref(),
        patient_case_key.as_ref(),
        &[_patient_escrow_bump],
    ];

    let signer_seeds = &[&seeds[..]];

    solana_program::program::invoke_signed(
        &create_escrow_ix,
        accounts_needed,
        signer_seeds
    )?;

    // We Need To Ensure The Escrow Patient PDA account was created successfully
    // There will be an error from the create_account instruction if creation failed somehow.
   
    Ok(())


}



// MIGHT NOT IMPLEMENT THE CLOSE FUNCTIONALITY AFTER ALL.

fn _close_patient_case(ctx: Context<VerifyPatientCase>) -> Result<()> {
    
    let patient_case = &mut ctx.accounts.patient_case;

    let verifier = &mut ctx.accounts.verifier;
    let verifier_info = verifier.to_account_info();
    patient_case.close(verifier_info)?;

    Ok(())
}
/* 
    let verifier_info = verifier.to_account_info();
    let patient_case_info = patient_case.to_account_info();
    //let verifier_key = verifier.key();

    // Calculate lamports that will be transferred
    /* 
    let _patient_case_lamports = patient_case.to_account_info().lamports();
    
    let verifier_info_lamports = verifier_info.lamports();
    **verifier_info_lamports.borrow_mut() = verifier_info_lamports.checked_add(patient_case_info.lamports()).unwrap();
    **patient_case_info.lamports().borrow_mut() = 0;
   patient_case_info.assign(&system_program::ID);
   patient_case_info.realloc(0, false).map_err(Into::into);
*/
    **verifier_info.try_borrow_mut_lamports()? = verifier_info
        .lamports()
        .checked_add(patient_case_info.lamports())
        .ok_or(MedifundError::OverflowError)?;
    **patient_case_info.try_borrow_mut_lamports()? = 0;

    patient_case_info.assign(&system_program::ID);
    patient_case_info.realloc(0, false)?;
/* 
     // Zero out all the data
     let mut data = patient_case_info.data.borrow_mut();
     for byte in data.iter_mut() {
         *byte = 0;
     }
     drop(data);*/
/* 
    // Create close instruction
    let close_ix = system_instruction::transfer(
        &patient_case_info.key(),
        &_verifier_info.key(),
        patient_case_lamports
    );

    let accounts_needed = &[
        patient_case_info.clone(),
        _verifier_info.clone(),
        ctx.accounts.system_program.to_account_info(),
    ];

    // We need signer seeds, cox of transfer from pda
    let seeds = &[
        b"patient",
        case_lookup.patient_address.as_ref(),
        //verifier_key.as_ref(),
        &[patient_case.patient_case_bump]
    ];

    let signer_seeds = &[&seeds[..]];

    solana_program::program::invoke_signed(
        &close_ix,
        accounts_needed,
        signer_seeds
    )?;*/

   
    
    Ok(())
}*/