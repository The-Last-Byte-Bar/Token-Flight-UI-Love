import { Router, Request, Response } from 'express';
import * as airdropController from '../controllers/airdrop.controller';

const router = Router();

/**
 * @swagger
 * /airdrop/validate:
 *   post:
 *     summary: Validate an airdrop configuration
 *     description: Checks if an airdrop configuration is valid and returns validation errors if any
 *     tags:
 *       - Airdrop
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AirdropConfig'
 *     responses:
 *       200:
 *         description: Validation passed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: false
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["No recipients specified"]
 */
router.post('/validate', async (req: Request, res: Response) => {
  await airdropController.validateAirdropConfig(req, res);
});

/**
 * @swagger
 * /airdrop/calculate-fee:
 *   post:
 *     summary: Calculate the fee for an airdrop
 *     description: Calculates the estimated fee for executing an airdrop with the given configuration
 *     tags:
 *       - Airdrop
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AirdropConfig'
 *     responses:
 *       200:
 *         description: Fee calculation successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fee:
 *                   type: string
 *                   description: Fee in nanoERG
 *                   example: "10000000"
 *                 feeInErg:
 *                   type: number
 *                   description: Fee in ERG
 *                   example: 0.01
 */
router.post('/calculate-fee', async (req: Request, res: Response) => {
  await airdropController.calculateAirdropFee(req, res);
});

/**
 * @swagger
 * /airdrop/execute:
 *   post:
 *     summary: Execute an airdrop
 *     description: Executes an airdrop with the given configuration and sender address
 *     tags:
 *       - Airdrop
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - config
 *               - senderAddress
 *             properties:
 *               config:
 *                 $ref: '#/components/schemas/AirdropConfig'
 *               senderAddress:
 *                 type: string
 *                 description: Sender wallet address
 *     responses:
 *       200:
 *         description: Airdrop execution successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 txId:
 *                   type: string
 *                   description: Transaction ID
 *                   example: "9f5ZKbECR3HHtUbCR5UGQwkYGGt6K5VHAiGQw89RqDHHZ7jnSW1"
 *                 recordId:
 *                   type: string
 *                   description: Record ID for tracking progress
 *                   example: "tx_1629384756_abc123def"
 *       400:
 *         description: Invalid configuration or missing parameters
 *       500:
 *         description: Failed to execute airdrop
 */
router.post('/execute', async (req: Request, res: Response) => {
  await airdropController.executeAirdrop(req, res);
});

/**
 * @swagger
 * /airdrop/transactions/{address}:
 *   get:
 *     summary: Get transaction history for an address
 *     description: Returns all airdrop transactions initiated by the specified address
 *     tags:
 *       - Airdrop
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet address
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TransactionRecord'
 *       400:
 *         description: Missing wallet address
 *       500:
 *         description: Failed to get transaction history
 */
router.get('/transactions/:address', async (req: Request, res: Response) => {
  await airdropController.getTransactionHistory(req, res);
});

/**
 * @swagger
 * /airdrop/progress/{id}:
 *   get:
 *     summary: Get transaction progress
 *     description: Returns the progress of an airdrop transaction
 *     tags:
 *       - Airdrop
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction record ID
 *     responses:
 *       200:
 *         description: Transaction progress retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transaction:
 *                   $ref: '#/components/schemas/TransactionRecord'
 *                 progress:
 *                   $ref: '#/components/schemas/TransactionProgress'
 *       400:
 *         description: Missing transaction ID
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Failed to get transaction progress
 */
router.get('/progress/:id', async (req: Request, res: Response) => {
  await airdropController.getTransactionProgress(req, res);
});

/**
 * @swagger
 * /airdrop/preview:
 *   post:
 *     summary: Generate a preview of an airdrop
 *     description: Returns a detailed preview of the airdrop distribution without executing it
 *     tags:
 *       - Airdrop
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - config
 *             properties:
 *               config:
 *                 $ref: '#/components/schemas/AirdropConfig'
 *               tokenMetadata:
 *                 type: object
 *                 description: Optional metadata for tokens
 *                 additionalProperties:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     decimals:
 *                       type: number
 *     responses:
 *       200:
 *         description: Preview generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AirdropPreview'
 *       400:
 *         description: Invalid configuration
 *       500:
 *         description: Failed to generate preview
 */
router.post('/preview', async (req: Request, res: Response) => {
  await airdropController.generateAirdropPreview(req, res);
});

export default router; 