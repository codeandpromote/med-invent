<?php
declare(strict_types=1);

function normalize_indian_mobile(string $raw): string
{
    $digits = preg_replace('/\D+/', '', $raw) ?? '';
    if (strlen($digits) === 12 && str_starts_with($digits, '91')) {
        return substr($digits, 2);
    }
    if (strlen($digits) === 11 && str_starts_with($digits, '0')) {
        return substr($digits, 1);
    }
    return $digits;
}

function validate_customer_input(array $input): array
{
    $errors = [];

    $clean = [
        'ordering_name'    => trim((string)($input['orderingName'] ?? $input['ordering_name'] ?? '')),
        'ordering_mobile'  => normalize_indian_mobile((string)($input['orderingMobile'] ?? $input['ordering_mobile'] ?? '')),
        'billing_address'  => trim((string)($input['billingAddress'] ?? $input['billing_address'] ?? '')),
        'delivery_address' => trim((string)($input['deliveryAddress'] ?? $input['delivery_address'] ?? '')),
        'pin_code'         => trim((string)($input['pinCode'] ?? $input['pin_code'] ?? '')),
        'receiving_name'   => trim((string)($input['receivingName'] ?? $input['receiving_name'] ?? '')),
        'receiving_mobile' => normalize_indian_mobile((string)($input['receivingMobile'] ?? $input['receiving_mobile'] ?? '')),
        'hospital_name'    => trim((string)($input['hospitalName'] ?? $input['hospital_name'] ?? '')),
        'email'            => trim((string)($input['email'] ?? '')),
        'gstin'            => strtoupper(trim((string)($input['gstin'] ?? ''))),
        'notes'            => trim((string)($input['notes'] ?? '')),
    ];

    if (mb_strlen($clean['ordering_name']) < 2) {
        $errors['orderingName'] = 'Please enter the full name of the person ordering.';
    }
    if (!preg_match('/^[6-9]\d{9}$/', $clean['ordering_mobile'])) {
        $errors['orderingMobile'] = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (mb_strlen($clean['billing_address']) < 8) {
        $errors['billingAddress'] = 'Enter a complete billing address in India.';
    }
    if (mb_strlen($clean['delivery_address']) < 8) {
        $errors['deliveryAddress'] = 'Enter a complete delivery address in India.';
    }
    if (!preg_match('/^[1-9]\d{5}$/', $clean['pin_code'])) {
        $errors['pinCode'] = 'Enter a valid 6-digit Indian PIN code.';
    }
    if (mb_strlen($clean['receiving_name']) < 2) {
        $errors['receivingName'] = 'Please enter the name of the person receiving delivery.';
    }
    if (!preg_match('/^[6-9]\d{9}$/', $clean['receiving_mobile'])) {
        $errors['receivingMobile'] = 'Enter a valid 10-digit Indian mobile number for receiver.';
    }
    if ($clean['email'] !== '' && !filter_var($clean['email'], FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = 'Enter a valid email address or leave blank.';
    }
    if ($clean['gstin'] !== '' && !preg_match('/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/', $clean['gstin'])) {
        $errors['gstin'] = 'Enter a valid 15-character GSTIN or leave blank.';
    }

    return ['clean' => $clean, 'errors' => $errors];
}
