use anchor_lang::{prelude::*, system_program::{Transfer, transfer}};

use crate::states::{contexts::*, errors::*, DonationsMade};




pub fn donate_funds_to_patient_escrow(ctx: Context<Donation>, case_id: String, amount_to_donate: u64) -> Result<()> {
    // Check to ensure if case is verified or not.
    require!(ctx.accounts.patient_case.is_verified == true, MedifundError::UnverifiedCase);
    // Let's Get the Patient Escrow PDA, Patient Case and Donor PDAs
    let patient_case = &mut ctx.accounts.patient_case;
    let patient_escrow = &mut ctx.accounts.patient_escrow;
    let donor_info = &mut ctx.accounts.donor_account;

    let donor = &ctx.accounts.donor;


    // We Need To Prevent Overfunding of a case
    require!(patient_case.case_funded == false, MedifundError::CaseFullyFunded);

    require!(patient_escrow.try_lamports()? >= 890880, MedifundError::EscrowNotExist);

    // We have already checked for valid case_id. Ensure non-zero amount
    require!(amount_to_donate > 0, MedifundError::NonZeroAmount);
    
    // Let's check that Donor has enough lamports to donate
    require!(donor.to_account_info().lamports() >= amount_to_donate, MedifundError::InsufficientBalance);

    // Let's update Donor Account
    donor_info.donor_address = donor.key();
    donor_info.donor_bump = ctx.bumps.donor_account;
    donor_info.total_donations = donor_info.total_donations.checked_add(amount_to_donate).ok_or(MedifundError::OverflowError)?;

    // Let's Update the patient-case with these infos
    patient_case.total_raised = patient_case.total_raised.checked_add(amount_to_donate).ok_or(MedifundError::OverflowError)?;
    // Ensure raised amount does not exceed needed amount + 1 SOL (to compensate rent-exempt)
    require!(patient_case.total_raised <= patient_case.total_amount_needed + 1000000000, MedifundError::DonationsExceeded);

    // Now, we need to perform the actual transfer from donor to patient_escrow via cpi
    let cpi_program = ctx.accounts.system_program.to_account_info();

    let cpi_accounts = Transfer {
        from: donor.to_account_info(),
        to: patient_escrow.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    transfer(cpi_ctx, amount_to_donate)?;

    // CATCHING THIS EVENT ON-CHAIN ANYTIME A DONATION IS MADE TO ANY CASE ID
    let message = format!("A Donor of address {} has contributed an amount of {} to patient case of ID {}", donor.key(), amount_to_donate, case_id);
    let current_time = Clock::get()?.unix_timestamp;

    emit!(DonationsMade {
        message,
        donor_address: donor.key(),
        donated_amount: amount_to_donate,
        case_id: case_id,
        timestamp: current_time
    });

    Ok(())
}