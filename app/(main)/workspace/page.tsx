import WorkspaceClient from '@/components/WorkspaceClient';
import { getWorkspaceById, getWorkspaceUser } from '@/server-actions/workspace';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import React from 'react'


interface WorkspacePageProps {
    searchParams: Promise<{prompt?: string; id?: string}>;
}
const WorkSpacePage = async ({searchParams}:WorkspacePageProps) => {

    const { userId } = await auth();
    if(!userId) redirect("/");

    const {id, prompt} = await searchParams;

    const user = await getWorkspaceUser();

    let workspace = null;

    if(id){
        workspace = await getWorkspaceById(id, user.id);
    }

    return (
        <WorkspaceClient 
            initialPrompt={prompt ?? null}
            userCredits= {user.credits}
            userId={userId}
            userPlan={user.plan}
            workspace={workspace}
        />
    )
}

export default WorkSpacePage;