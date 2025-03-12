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
 *       400:
 *         description: Invalid configuration or missing parameters
 *       500:
 *         description: Failed to execute airdrop
 */
router.post('/execute', async (req: Request, res: Response) => {
  await airdropController.executeAirdrop(req, res);
});

export default router; 