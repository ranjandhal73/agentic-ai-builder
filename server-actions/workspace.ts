import { db } from "@/lib/prisma/prisma";
import { WorkspaceData, WorkspaceUser } from "@/types/workspace";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";


export const getWorkspaceUser = async ():Promise<WorkspaceUser> => {
    const {userId: clerkId} = await auth();

    if(!clerkId) redirect("/");

    const user = await db.user.findUnique({
        where: {clerkId},
        select: {id: true, credits: true, plan: true}
    });

    if(!user) redirect("/");
    return user;
}


export const getWorkspaceById = async (workspaceId: string, userId: string): Promise<WorkspaceData> => {
    const workspace = await db.workspaces.findUnique({
        where:{id: workspaceId},
        select:{id: true, title: true, message: true, fileData: true}
    });

    if(!workspace) redirect("/");
    return workspace;
}