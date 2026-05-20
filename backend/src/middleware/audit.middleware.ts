import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

export const auditMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Capture the original send method to intercept the response
  const originalSend = res.send;
  let responseBody: any;

  res.send = function (body) {
    responseBody = body;
    return originalSend.call(this, body);
  };

  res.on('finish', async () => {
    // Only log modifying requests
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return;
    }

    // Skip login
    if (req.originalUrl.includes('/api/auth/login')) {
      return;
    }

    // Check if the request was successful
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        let action = req.method;
        if (req.method === 'POST') action = 'CREATE';
        if (req.method === 'PUT' || req.method === 'PATCH') action = 'UPDATE';
        if (req.method === 'DELETE') action = 'DELETE';

        // Extract entity type from URL
        const urlParts = req.originalUrl.split('?')[0].split('/').filter(Boolean);
        let entityType = 'UNKNOWN';
        if (urlParts.length >= 2 && urlParts[0] === 'api') {
          entityType = urlParts[1].toUpperCase();
        }

        let entityId = 0;
        
        // Try to get entityId from response body if it's a CREATE
        if (action === 'CREATE' && responseBody) {
            try {
                const parsedBody = JSON.parse(responseBody);
                if (parsedBody && typeof parsedBody.id === 'number') {
                    entityId = parsedBody.id;
                } else if (parsedBody && parsedBody.data && typeof parsedBody.data.id === 'number') {
                    entityId = parsedBody.data.id;
                }
            } catch (e) {
                // ignore JSON parse error
            }
        } 
        
        // If not CREATE, or failed to get ID, try to get from URL params
        if (!entityId && urlParts.length > 2) {
          const possibleId = parseInt(urlParts[urlParts.length - 1], 10);
          if (!isNaN(possibleId)) {
            entityId = possibleId;
          }
        }

        const performedBy = (req as any).user?.username || 'System';

        await prisma.auditLog.create({
          data: {
            entityType,
            entityId,
            action,
            details: `API: ${req.method} ${req.originalUrl}`,
            performedBy,
          },
        });
      } catch (error) {
        console.error('Audit Middleware Error:', error);
      }
    }
  });

  next();
};
