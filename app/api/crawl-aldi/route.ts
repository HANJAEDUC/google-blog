import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST() {
    try {
        const scriptPath = path.join(process.cwd(), 'scripts', 'crawl_aldi.js');
        
        // Run crawler script
        const { stdout, stderr } = await execAsync(`node "${scriptPath}"`, {
            timeout: 120000, // 2 minutes timeout
        });
        
        console.log('Crawler output:', stdout);
        if (stderr) console.error('Crawler errors:', stderr);
        
        return NextResponse.json({ 
            success: true, 
            message: 'Aldi offers updated successfully!',
            output: stdout
        });
    } catch (error: any) {
        console.error('Crawler failed:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
