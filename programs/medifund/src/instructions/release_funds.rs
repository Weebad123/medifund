use anchor_lang::{prelude::*, solana_program::{self, rent::Rent}};

use crate::states::{contexts::*, errors::*, ReleaseOfFunds};

pub fn release_funds(ctx: Context<ReleaseFunds>, case_id: String) -> Result<()> {
    // Let's get the necessary accounts
    let patient_escrow = &mut ctx.accounts.patient_escrow;
    let patient_case = &mut ctx.accounts.patient_case;
    let verifiers_registry = &ctx.accounts.verifiers_list;
    let treatment_address = &mut ctx.accounts.facility_address;
    let case_lookup = &ctx.accounts.case_lookup;


    //Let's validate that the PDAs of the signers are actual verifiers from the registry
    require!(verifiers_registry.all_verifiers.contains(&ctx.accounts.verifier1_pda.key()) && 
        verifiers_registry.all_verifiers.contains(&ctx.accounts.verifier2_pda.key()) && 
        verifiers_registry.all_verifiers.contains(&ctx.accounts.verifier3_pda.key()), 
        MedifundError::VerifierNotFound);

    // We Get The Escrow Balance Including Rent-exempt
    let total_escrow_balance = patient_escrow.lamports();
    let rent = Rent::get()?;
    let rent_lamports = rent.minimum_balance(0);
    // Get Actual Escrow balance excluding Rent-exempt
    // @dev This is to ensure the patient escrow account can continue to receive donations
    let actual_escrow_balance = total_escrow_balance.checked_sub(rent_lamports).ok_or(MedifundError::UnderflowError)?;

    require!(actual_escrow_balance > 0, MedifundError::NonZeroAmount);

   
    //  ...............          SET UP FOR TRANSFER VIA LOW-LEVEL SOLANA CALL         .............   //

    let patient_case_key = &patient_case.key();
 
    let seeds = &[
        b"patient_escrow",
        case_id.as_bytes().as_ref(),
        patient_case_key.as_ref(),
        &[case_lookup.patient_escrow_bump]
    ];

    let signer_seeds = &[&seeds[..]];
 
    let transfer_ix = solana_program::system_instruction::transfer(
        &patient_escrow.key(),
        &treatment_address.key(),
        actual_escrow_balance
    );
 
    solana_program::program::invoke_signed(
        &transfer_ix,
        &[
            patient_escrow.clone(),
            treatment_address.clone(),
            ctx.accounts.system_program.to_account_info()
        ],
        signer_seeds
    )?;

    // CHECK: To ensure there is still rent-exempt for the Escrow As Long As Total Amount Has Not Been Raised
    let final_balance_transfer = patient_escrow.lamports();
    require!(final_balance_transfer >= rent_lamports, MedifundError::InsufficientRentBalance);

    // Update Patient Case With This Transferred Amount
    patient_case.total_raised = patient_case.total_raised
        .checked_sub(actual_escrow_balance).ok_or(MedifundError::UnderflowError)?;

    patient_case.total_amount_needed = patient_case.total_amount_needed
        .checked_sub(actual_escrow_balance).ok_or(MedifundError::UnderflowError)?;


    // EMIT AN EVENT FOR THIS INSTRUCTION ON-CHAIN ANYTIME THERE IS A RELEASE OF FUNDS
    let current_time = Clock::get()?.unix_timestamp;
    let message = format!("Contributed Funds of amount {} has been released for patient case ID ,{} at time of ,{}",
         actual_escrow_balance, case_id, current_time);

    emit!(
        ReleaseOfFunds{
            message,
            treatment_address: treatment_address.key(),
            transferred_amount: actual_escrow_balance,
            case_id: case_id,
            timestamp: current_time
        }
    );


    Ok(())
}
