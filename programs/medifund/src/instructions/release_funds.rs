use anchor_lang::{prelude::*, solana_program::{self, rent::Rent}/* , system_program::{_transfer, Transfer}*/};

use crate::states::{contexts::*, errors::*};

pub fn release_funds(ctx: Context<ReleaseFunds>, case_id: String) -> Result<()> {
    // Let's get the necessary accounts
    let patient_escrow = &mut ctx.accounts.patient_escrow;
    let patient_case = &mut ctx.accounts.patient_case;
    let verifiers_registry = &ctx.accounts.verifiers_list;
    let treatment_address = &mut ctx.accounts.facility_address;
    let case_lookup = &ctx.accounts.case_lookup;

    // Get Verifiers PDA
    //let verifier1_pda = &ctx.accounts.verifier1_pda;
    //let verifier2_pda = &ctx.accounts.verifier2_pda;
    //let verifier3_pda = &ctx.accounts.verifier3_pda;


    // Let's validate that the PDAs of the signers are actual verifiers from the registry
    require!(verifiers_registry.all_verifiers.contains(&ctx.accounts.verifier1_pda.key()) && 
        verifiers_registry.all_verifiers.contains(&ctx.accounts.verifier2_pda.key()) && 
        verifiers_registry.all_verifiers.contains(&ctx.accounts.verifier3_pda.key()), 
        MedifundError::VerifierNotFound);

    // We Get The Escrow Balance Including Rent-exempt
    let total_escrow_balance = patient_escrow.try_lamports()?;
    let rent = Rent::get()?;
    let space = 0;
    let rent_lamports = rent.minimum_balance(space);
    // Get Actual Escrow balance excluding Rent-exempt
    let actual_escrow_balance = total_escrow_balance.checked_sub(rent_lamports).ok_or(MedifundError::UnderflowError)?;

    require!(actual_escrow_balance > 0, MedifundError::NonZeroAmount);

    // perform actual transfer via CPI
    let _cpi_program = ctx.accounts.system_program.to_account_info();

    let cpi_accounts = & [
        patient_escrow.to_account_info(),
        treatment_address.to_account_info(),
    ];

    let patient_case_key = &patient_case.key();

    let seeds = &[
        b"patient_escrow",
        case_id.as_bytes(),
        patient_case_key.as_ref(),
        &[case_lookup.patient_escrow_bump]
    ];

    let signer_seeds = &[&seeds[..]];

    let transfer_ix = solana_program::system_instruction::transfer(
        &ctx.accounts.patient_escrow.key(),
        &ctx.accounts.facility_address.key(),
        actual_escrow_balance
    );
/* 
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

    transfer(cpi_ctx, actual_escrow_balance)?;*/

    solana_program::program::invoke_signed(
        &transfer_ix,
        cpi_accounts,
        signer_seeds
    )?;

    // Update Patient Case With This Transferred Amount
    patient_case.total_raised = patient_case.total_raised
        .checked_sub(actual_escrow_balance).ok_or(MedifundError::UnderflowError)?;

    patient_case.total_amount_needed = patient_case.total_amount_needed
        .checked_sub(actual_escrow_balance).ok_or(MedifundError::UnderflowError)?;


    Ok(())
}